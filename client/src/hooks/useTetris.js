// ============================================================
//  useTetris.js - 테트리스 게임 상태 관리 React Hook
//  담당: 개발자 A (게임 엔진 담당)
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  createBoard,
  isValidPosition,
  lockPiece,
  clearLines,
  rotatePiece,
  spawnPiece,
  getGhostPosition,
  addGarbageLines,
  isTSpin as checkTSpin,
  PieceQueue,
} from '../game/engine';
import {
  INITIAL_DROP_SPEED,
  SPEED_DECREASE_PER_LEVEL,
  MIN_DROP_SPEED,
  LINES_PER_LEVEL,
  SOFT_DROP_MULTIPLIER,
  LOCK_DELAY,
  MAX_LOCK_RESETS,
  KEY_BINDINGS,
} from '../game/constants';

/**
 * 테트리스 게임 전체 상태와 로직을 관리하는 커스텀 훅
 *
 * @param {object} options
 * @param {Function} options.onLineCleared - 줄 제거 시 콜백 (서버 전송용)
 * @param {Function} options.onGameOver - 게임 오버 시 콜백
 * @param {Function} options.onStateUpdate - 상태 업데이트 시 콜백 (상대방에게 전송)
 * @returns {object}
 */
export function useTetris({ onLineCleared, onGameOver, onStateUpdate } = {}) {
  const [board, setBoard] = useState(createBoard());
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [totalLines, setTotalLines] = useState(0);
  const [currentPiece, setCurrentPiece] = useState(null);
  const [holdPiece, setHoldPiece] = useState(null);
  const [canHold, setCanHold] = useState(true);
  const [nextPieces, setNextPieces] = useState([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [combo, setCombo] = useState(0);

  const pieceQueueRef = useRef(null);
  const dropTimerRef = useRef(null);
  const lockTimerRef = useRef(null);
  const lockResetsRef = useRef(0);
  const boardRef = useRef(board);
  const currentPieceRef = useRef(currentPiece);
  const isGameOverRef = useRef(false);
  const comboRef = useRef(0);

  // Refs와 State 동기화
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { currentPieceRef.current = currentPiece; }, [currentPiece]);
  useEffect(() => { isGameOverRef.current = isGameOver; }, [isGameOver]);
  useEffect(() => { comboRef.current = combo; }, [combo]);

  // ---------- 게임 시작 ----------
  const startGame = useCallback(() => {
    const newBoard = createBoard();
    pieceQueueRef.current = new PieceQueue();
    lockResetsRef.current = 0;
    comboRef.current = 0;

    setBoard(newBoard);
    setScore(0);
    setLevel(1);
    setTotalLines(0);
    setHoldPiece(null);
    setCanHold(true);
    setIsGameOver(false);
    setIsPlaying(true);
    setCombo(0);

    boardRef.current = newBoard;
    isGameOverRef.current = false;

    // 첫 피스 스폰
    const firstPieceName = pieceQueueRef.current.next();
    const firstPiece = spawnPiece(firstPieceName);
    setCurrentPiece(firstPiece);
    currentPieceRef.current = firstPiece;
    setNextPieces(pieceQueueRef.current.preview(5));
  }, []);

  // ---------- 다음 피스 스폰 ----------
  const spawnNext = useCallback(() => {
    if (!pieceQueueRef.current) return;

    const nextName = pieceQueueRef.current.next();
    const newPiece = spawnPiece(nextName);

    // 스폰 위치에 충돌 -> 게임 오버
    if (!isValidPosition(boardRef.current, newPiece.shape, newPiece.x, newPiece.y)) {
      setIsGameOver(true);
      setIsPlaying(false);
      isGameOverRef.current = true;
      onGameOver?.();
      return;
    }

    setCurrentPiece(newPiece);
    currentPieceRef.current = newPiece;
    setNextPieces(pieceQueueRef.current.preview(5));
    setCanHold(true);
    lockResetsRef.current = 0;
  }, [onGameOver]);

  // ---------- 피스 고정 처리 ----------
  const lock = useCallback(() => {
    const piece = currentPieceRef.current;
    const currentBoard = boardRef.current;
    if (!piece) return;

    // 피스를 보드에 고정
    let newBoard = lockPiece(currentBoard, piece);

    // T-Spin 체크
    const tSpin = checkTSpin(currentBoard, piece);

    // 줄 제거
    const { board: clearedBoard, linesCleared } = clearLines(newBoard);
    newBoard = clearedBoard;

    // 콤보 처리
    let newCombo = comboRef.current;
    if (linesCleared > 0) {
      newCombo++;
      setCombo(newCombo);
      comboRef.current = newCombo;

      // 점수 & 줄 업데이트
      setTotalLines(prev => {
        const newTotal = prev + linesCleared;
        setLevel(Math.floor(newTotal / LINES_PER_LEVEL) + 1);
        return newTotal;
      });

      // 서버에 알림
      onLineCleared?.({ linesCleared, isTSpin: tSpin, combo: newCombo });
    } else {
      setCombo(0);
      comboRef.current = 0;
    }

    setBoard(newBoard);
    boardRef.current = newBoard;

    // 상태 업데이트 전송 (상대방 미니보드용)
    onStateUpdate?.({ board: newBoard });

    // 다음 피스
    spawnNext();
  }, [spawnNext, onLineCleared, onStateUpdate]);

  // ---------- 이동 ----------
  const movePiece = useCallback((dx, dy) => {
    const piece = currentPieceRef.current;
    if (!piece || isGameOverRef.current) return false;

    const newX = piece.x + dx;
    const newY = piece.y + dy;

    if (isValidPosition(boardRef.current, piece.shape, newX, newY)) {
      const movedPiece = { ...piece, x: newX, y: newY };
      setCurrentPiece(movedPiece);
      currentPieceRef.current = movedPiece;

      // 잠금 딜레이 리셋 (수평 이동 시)
      if (dx !== 0 && lockResetsRef.current < MAX_LOCK_RESETS) {
        lockResetsRef.current++;
      }

      return true;
    }

    // 아래로 이동 불가 -> 잠금
    if (dy > 0) {
      lock();
    }

    return false;
  }, [lock]);

  // ---------- 회전 ----------
  const rotate = useCallback((direction) => {
    const piece = currentPieceRef.current;
    if (!piece || isGameOverRef.current) return;

    const rotated = rotatePiece(boardRef.current, piece, direction);
    if (rotated) {
      setCurrentPiece(rotated);
      currentPieceRef.current = rotated;

      if (lockResetsRef.current < MAX_LOCK_RESETS) {
        lockResetsRef.current++;
      }
    }
  }, []);

  // ---------- 하드 드롭 ----------
  const hardDrop = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece || isGameOverRef.current) return;

    const ghostY = getGhostPosition(boardRef.current, piece);
    const droppedPiece = { ...piece, y: ghostY };

    setCurrentPiece(droppedPiece);
    currentPieceRef.current = droppedPiece;

    // 점수 추가 (드롭 거리 * 2)
    setScore(prev => prev + (ghostY - piece.y) * 2);

    lock();
  }, [lock]);

  // ---------- 홀드 ----------
  const hold = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece || !canHold || isGameOverRef.current) return;

    setCanHold(false);

    if (holdPiece) {
      // 홀드에 있던 피스를 꺼내고, 현재 피스를 홀드에 넣음
      const newCurrent = spawnPiece(holdPiece);
      setHoldPiece(piece.name);
      setCurrentPiece(newCurrent);
      currentPieceRef.current = newCurrent;
    } else {
      // 홀드가 비어있으면 현재 피스를 넣고 다음 피스 스폰
      setHoldPiece(piece.name);
      spawnNext();
    }
  }, [canHold, holdPiece, spawnNext]);

  // ---------- 쓰레기 줄 수신 ----------
  const receiveGarbage = useCallback((garbageLines) => {
    setBoard(prev => {
      const newBoard = addGarbageLines(prev, garbageLines);
      boardRef.current = newBoard;
      return newBoard;
    });
  }, []);

  // ---------- 자동 낙하 ----------
  useEffect(() => {
    if (!isPlaying || isGameOver) {
      clearInterval(dropTimerRef.current);
      return;
    }

    const speed = Math.max(
      INITIAL_DROP_SPEED - (level - 1) * SPEED_DECREASE_PER_LEVEL,
      MIN_DROP_SPEED
    );

    dropTimerRef.current = setInterval(() => {
      movePiece(0, 1);
    }, speed);

    return () => clearInterval(dropTimerRef.current);
  }, [isPlaying, isGameOver, level, movePiece]);

  // ---------- 키보드 입력 처리 ----------
  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case KEY_BINDINGS.MOVE_LEFT:
          e.preventDefault();
          movePiece(-1, 0);
          break;
        case KEY_BINDINGS.MOVE_RIGHT:
          e.preventDefault();
          movePiece(1, 0);
          break;
        case KEY_BINDINGS.SOFT_DROP:
          e.preventDefault();
          movePiece(0, 1);
          break;
        case KEY_BINDINGS.HARD_DROP:
          e.preventDefault();
          hardDrop();
          break;
        case KEY_BINDINGS.ROTATE_CW:
          e.preventDefault();
          rotate(1);
          break;
        case KEY_BINDINGS.ROTATE_CCW:
          e.preventDefault();
          rotate(-1);
          break;
        case KEY_BINDINGS.HOLD:
          e.preventDefault();
          hold();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isGameOver, movePiece, hardDrop, rotate, hold]);

  // ---------- 고스트 피스 위치 ----------
  const ghostY = currentPiece
    ? getGhostPosition(board, currentPiece)
    : null;

  return {
    board,
    score,
    level,
    totalLines,
    currentPiece,
    holdPiece,
    nextPieces,
    isGameOver,
    isPlaying,
    combo,
    ghostY,
    startGame,
    movePiece,
    rotate,
    hardDrop,
    hold,
    receiveGarbage,
  };
}
