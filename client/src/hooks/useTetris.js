// ============================================================
//  useTetris.js - 테트리스 게임 상태 관리 React Hook
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

const NORMAL_LINE_SCORES = [0, 100, 300, 500, 800];
const T_SPIN_SCORES = [400, 800, 1200, 1600];

function getLineClearScore(linesCleared, isTSpin, level, combo) {
  const table = isTSpin ? T_SPIN_SCORES : NORMAL_LINE_SCORES;
  const baseScore = table[Math.min(linesCleared, table.length - 1)] || 0;
  const comboBonus = linesCleared > 0 ? Math.max(0, combo - 1) * 50 : 0;
  return (baseScore + comboBonus) * level;
}

/**
 * 테트리스 게임 전체 상태와 입력, 타이머를 관리합니다.
 */
export function useTetris({
  onLineCleared,
  onGameOver,
  onStateUpdate,
  onSound,
  keys = KEY_BINDINGS,
  canReset = true,
} = {}) {
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
  const [isPaused, setIsPaused] = useState(false);
  const [isSoftDropping, setIsSoftDropping] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const pieceQueueRef = useRef(null);
  const dropTimerRef = useRef(null);
  const lockTimerRef = useRef(null);
  const lockResetsRef = useRef(0);
  const boardRef = useRef(board);
  const currentPieceRef = useRef(currentPiece);
  const holdPieceRef = useRef(holdPiece);
  const canHoldRef = useRef(canHold);
  const scoreRef = useRef(score);
  const levelRef = useRef(level);
  const totalLinesRef = useRef(totalLines);
  const comboRef = useRef(combo);
  const isGameOverRef = useRef(false);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const gameModeRef = useRef('marathon');
  const lastActionRef = useRef(null);
  const gameStartedAtRef = useRef(null);
  const pausedAtRef = useRef(null);
  const totalPausedTimeRef = useRef(0);

  const cancelLock = useCallback(() => {
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  const clearDropTimer = useCallback(() => {
    if (dropTimerRef.current) {
      clearInterval(dropTimerRef.current);
      dropTimerRef.current = null;
    }
  }, []);

  const addScore = useCallback((points) => {
    if (points <= 0) return;
    scoreRef.current += points;
    setScore(scoreRef.current);
  }, []);

  const finishGame = useCallback((reason = 'top-out') => {
    if (isGameOverRef.current) return;

    cancelLock();
    clearDropTimer();
    isGameOverRef.current = true;
    isPlayingRef.current = false;
    isPausedRef.current = false;
    setIsGameOver(true);
    setIsPlaying(false);
    setIsPaused(false);
    setIsSoftDropping(false);
    if (gameStartedAtRef.current) {
      const pausedDuration = pausedAtRef.current ? Date.now() - pausedAtRef.current : 0;
      setElapsedTime(Date.now() - gameStartedAtRef.current - totalPausedTimeRef.current - pausedDuration);
    }
    onSound?.(reason === 'sprint-complete' ? 'success' : 'gameOver');
    onGameOver?.({ reason, mode: gameModeRef.current });
  }, [cancelLock, clearDropTimer, onGameOver, onSound]);

  const stopGame = useCallback(() => {
    if (!isPlayingRef.current) return;
    cancelLock();
    clearDropTimer();
    isPlayingRef.current = false;
    isGameOverRef.current = true;
    isPausedRef.current = false;
    setIsPlaying(false);
    setIsGameOver(true);
    setIsPaused(false);
    setIsSoftDropping(false);
    if (gameStartedAtRef.current) {
      const pausedDuration = pausedAtRef.current ? Date.now() - pausedAtRef.current : 0;
      setElapsedTime(Date.now() - gameStartedAtRef.current - totalPausedTimeRef.current - pausedDuration);
    }
  }, [cancelLock, clearDropTimer]);

  const startGame = useCallback(({ mode } = {}) => {
    cancelLock();
    clearDropTimer();

    const newBoard = createBoard();
    const nextMode = mode || gameModeRef.current || 'marathon';
    pieceQueueRef.current = new PieceQueue();
    gameModeRef.current = nextMode;
    lockResetsRef.current = 0;
    lastActionRef.current = null;
    gameStartedAtRef.current = Date.now();
    pausedAtRef.current = null;
    totalPausedTimeRef.current = 0;
    boardRef.current = newBoard;
    scoreRef.current = 0;
    levelRef.current = 1;
    totalLinesRef.current = 0;
    comboRef.current = 0;
    holdPieceRef.current = null;
    canHoldRef.current = true;
    isGameOverRef.current = false;
    isPlayingRef.current = true;
    isPausedRef.current = false;

    setBoard(newBoard);
    setScore(0);
    setLevel(1);
    setTotalLines(0);
    setHoldPiece(null);
    setCanHold(true);
    setIsGameOver(false);
    setIsPlaying(true);
    setIsPaused(false);
    setIsSoftDropping(false);
    setElapsedTime(0);
    setCombo(0);

    const firstPieceName = pieceQueueRef.current.next();
    const firstPiece = spawnPiece(firstPieceName);
    currentPieceRef.current = firstPiece;
    setCurrentPiece(firstPiece);
    setNextPieces(pieceQueueRef.current.preview(5));
    onSound?.('start');
    onStateUpdate?.({ board: newBoard, score: 0, lines: 0 });
  }, [cancelLock, clearDropTimer, onSound, onStateUpdate]);

  const spawnNext = useCallback(({ resetHold = true } = {}) => {
    if (!pieceQueueRef.current || isGameOverRef.current) return false;

    cancelLock();
    lockResetsRef.current = 0;
    lastActionRef.current = null;

    const nextName = pieceQueueRef.current.next();
    let newPiece = spawnPiece(nextName);

    if (!isValidPosition(boardRef.current, newPiece.shape, newPiece.x, newPiece.y)) {
      if (gameModeRef.current === 'practice') {
        const freshBoard = createBoard();
        boardRef.current = freshBoard;
        setBoard(freshBoard);
        newPiece = spawnPiece(nextName);
        onStateUpdate?.({ board: freshBoard, score: scoreRef.current, lines: totalLinesRef.current });
      } else {
        currentPieceRef.current = null;
        setCurrentPiece(null);
        finishGame('top-out');
        return false;
      }
    }

    currentPieceRef.current = newPiece;
    setCurrentPiece(newPiece);
    setNextPieces(pieceQueueRef.current.preview(5));
    canHoldRef.current = resetHold;
    setCanHold(resetHold);
    return true;
  }, [cancelLock, finishGame, onStateUpdate]);

  const lock = useCallback(() => {
    if (isGameOverRef.current || isPausedRef.current) return;

    cancelLock();
    const piece = currentPieceRef.current;
    const currentBoard = boardRef.current;
    if (!piece) return;

    const lockedAboveTop = piece.shape.some((row, rowIndex) =>
      row.some(cell => cell !== 0) && piece.y + rowIndex < 0
    );
    const tSpin = lastActionRef.current === 'rotate' && checkTSpin(currentBoard, piece);
    const lockedBoard = lockPiece(currentBoard, piece);
    const { board: newBoard, linesCleared } = clearLines(lockedBoard);

    const newCombo = linesCleared > 0 ? comboRef.current + 1 : 0;
    const newTotal = totalLinesRef.current + linesCleared;
    const newLevel = Math.floor(newTotal / LINES_PER_LEVEL) + 1;
    const gainedScore = getLineClearScore(linesCleared, tSpin, levelRef.current, newCombo);

    comboRef.current = newCombo;
    totalLinesRef.current = newTotal;
    levelRef.current = newLevel;
    boardRef.current = newBoard;
    setCombo(newCombo);
    setTotalLines(newTotal);
    setLevel(newLevel);
    setBoard(newBoard);
    addScore(gainedScore);
    if (linesCleared > 0) onSound?.(tSpin ? 'tSpin' : 'clear');

    if (linesCleared > 0) {
      onLineCleared?.({
        linesCleared,
        isTSpin: tSpin,
        combo: newCombo,
        score: scoreRef.current,
      });
    }

    onStateUpdate?.({
      board: newBoard,
      score: scoreRef.current,
      lines: newTotal,
    });

    if (lockedAboveTop) {
      finishGame('top-out');
      return;
    }

    if (gameModeRef.current === 'sprint' && newTotal >= 40) {
      finishGame('sprint-complete');
      return;
    }

    spawnNext();
  }, [addScore, cancelLock, finishGame, onLineCleared, onSound, onStateUpdate, spawnNext]);

  const startLockTimer = useCallback(() => {
    if (isPausedRef.current || isGameOverRef.current || lockTimerRef.current) return;
    lockTimerRef.current = setTimeout(() => {
      lockTimerRef.current = null;
      lock();
    }, LOCK_DELAY);
  }, [lock]);

  const movePiece = useCallback((dx, dy, { softDrop = false } = {}) => {
    const piece = currentPieceRef.current;
    if (!piece || isGameOverRef.current || isPausedRef.current) return false;

    const newX = piece.x + dx;
    const newY = piece.y + dy;

    if (isValidPosition(boardRef.current, piece.shape, newX, newY)) {
      const movedPiece = { ...piece, x: newX, y: newY };
      currentPieceRef.current = movedPiece;
      setCurrentPiece(movedPiece);
      lastActionRef.current = 'move';

      if (softDrop && dy > 0) addScore(1);

      const onGround = !isValidPosition(boardRef.current, movedPiece.shape, newX, newY + 1);
      if (onGround) {
        if (lockResetsRef.current < MAX_LOCK_RESETS) {
          lockResetsRef.current += 1;
          cancelLock();
          startLockTimer();
        } else {
          startLockTimer();
        }
      } else {
        cancelLock();
      }
      return true;
    }

    if (dy > 0) startLockTimer();
    return false;
  }, [addScore, cancelLock, startLockTimer]);

  const rotate = useCallback((direction) => {
    const piece = currentPieceRef.current;
    if (!piece || isGameOverRef.current || isPausedRef.current) return false;

    const rotated = rotatePiece(boardRef.current, piece, direction);
    if (!rotated) return false;

    currentPieceRef.current = rotated;
    setCurrentPiece(rotated);
    lastActionRef.current = 'rotate';
    onSound?.('rotate');

    const onGround = !isValidPosition(boardRef.current, rotated.shape, rotated.x, rotated.y + 1);
    if (onGround) {
      if (lockResetsRef.current < MAX_LOCK_RESETS) {
        lockResetsRef.current += 1;
        cancelLock();
      }
      startLockTimer();
    } else {
      cancelLock();
    }
    return true;
  }, [cancelLock, onSound, startLockTimer]);

  const hardDrop = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece || isGameOverRef.current || isPausedRef.current) return;

    const ghostY = getGhostPosition(boardRef.current, piece);
    const droppedPiece = { ...piece, y: ghostY };
    currentPieceRef.current = droppedPiece;
    setCurrentPiece(droppedPiece);
    addScore(Math.max(0, ghostY - piece.y) * 2);
    onSound?.('drop');
    cancelLock();
    lock();
  }, [addScore, cancelLock, lock, onSound]);

  const hold = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece || !canHoldRef.current || isGameOverRef.current || isPausedRef.current) return;

    cancelLock();
    lockResetsRef.current = 0;
    lastActionRef.current = null;
    canHoldRef.current = false;
    setCanHold(false);
    onSound?.('hold');

    const storedName = holdPieceRef.current;
    holdPieceRef.current = piece.name;
    setHoldPiece(piece.name);

    if (!storedName) {
      spawnNext({ resetHold: false });
      return;
    }

    const swappedPiece = spawnPiece(storedName);
    if (!isValidPosition(boardRef.current, swappedPiece.shape, swappedPiece.x, swappedPiece.y)) {
      if (gameModeRef.current === 'practice') {
        const freshBoard = createBoard();
        boardRef.current = freshBoard;
        setBoard(freshBoard);
        onStateUpdate?.({ board: freshBoard, score: scoreRef.current, lines: totalLinesRef.current });
      } else {
        currentPieceRef.current = null;
        setCurrentPiece(null);
        finishGame('top-out');
        return;
      }
    }

    currentPieceRef.current = swappedPiece;
    setCurrentPiece(swappedPiece);
  }, [cancelLock, finishGame, onSound, onStateUpdate, spawnNext]);

  const receiveGarbage = useCallback((garbageLines) => {
    if (!Array.isArray(garbageLines) || garbageLines.length === 0 || isGameOverRef.current) return;

    const newBoard = addGarbageLines(boardRef.current, garbageLines);
    boardRef.current = newBoard;
    setBoard(newBoard);
    onSound?.('garbage');
    onStateUpdate?.({ board: newBoard, score: scoreRef.current, lines: totalLinesRef.current });

    const piece = currentPieceRef.current;
    if (piece && !isValidPosition(newBoard, piece.shape, piece.x, piece.y)) {
      finishGame('garbage-top-out');
    }
  }, [finishGame, onSound, onStateUpdate]);

  const pauseGame = useCallback(() => {
    if (!isPlayingRef.current || isGameOverRef.current || isPausedRef.current) return;
    cancelLock();
    setIsSoftDropping(false);
    pausedAtRef.current = Date.now();
    if (gameStartedAtRef.current) {
      setElapsedTime(pausedAtRef.current - gameStartedAtRef.current - totalPausedTimeRef.current);
    }
    isPausedRef.current = true;
    setIsPaused(true);
  }, [cancelLock]);

  const resumeGame = useCallback(() => {
    if (!isPlayingRef.current || isGameOverRef.current || !isPausedRef.current) return;
    if (pausedAtRef.current) {
      totalPausedTimeRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    isPausedRef.current = false;
    setIsPaused(false);

    const piece = currentPieceRef.current;
    if (piece && !isValidPosition(boardRef.current, piece.shape, piece.x, piece.y + 1)) {
      startLockTimer();
    }
  }, [startLockTimer]);

  useEffect(() => {
    if (!isPlaying || isGameOver || isPaused || !gameStartedAtRef.current) return undefined;
    const updateElapsedTime = () => {
      setElapsedTime(Date.now() - gameStartedAtRef.current - totalPausedTimeRef.current);
    };
    updateElapsedTime();
    const timer = setInterval(updateElapsedTime, 100);
    return () => clearInterval(timer);
  }, [isGameOver, isPaused, isPlaying]);

  useEffect(() => {
    clearDropTimer();
    if (!isPlaying || isGameOver || isPaused) return undefined;

    const normalSpeed = Math.max(
      INITIAL_DROP_SPEED - (level - 1) * SPEED_DECREASE_PER_LEVEL,
      MIN_DROP_SPEED
    );
    const speed = isSoftDropping
      ? Math.max(20, Math.floor(normalSpeed / SOFT_DROP_MULTIPLIER))
      : normalSpeed;

    dropTimerRef.current = setInterval(() => {
      movePiece(0, 1, { softDrop: isSoftDropping });
    }, speed);

    return clearDropTimer;
  }, [clearDropTimer, isGameOver, isPaused, isPlaying, isSoftDropping, level, movePiece]);

  useEffect(() => {
    if (!isPlaying || isGameOver || isPaused) return undefined;

    const isTypingTarget = () => {
      const tagName = document.activeElement?.tagName;
      return ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName);
    };

    const handleKeyDown = (event) => {
      if (isTypingTarget()) return;

      switch (event.key) {
        case keys.MOVE_LEFT:
          event.preventDefault();
          movePiece(-1, 0);
          break;
        case keys.MOVE_RIGHT:
          event.preventDefault();
          movePiece(1, 0);
          break;
        case keys.SOFT_DROP:
          event.preventDefault();
          if (!event.repeat) {
            movePiece(0, 1, { softDrop: true });
            setIsSoftDropping(true);
          }
          break;
        case keys.HARD_DROP:
          event.preventDefault();
          if (!event.repeat) hardDrop();
          break;
        case keys.ROTATE_CW:
          event.preventDefault();
          if (!event.repeat) rotate(1);
          break;
        case keys.ROTATE_CCW:
          event.preventDefault();
          if (!event.repeat) rotate(-1);
          break;
        case keys.HOLD:
          event.preventDefault();
          if (!event.repeat) hold();
          break;
        case keys.RESET:
          if (canReset) {
            event.preventDefault();
            if (!event.repeat) startGame({ mode: gameModeRef.current });
          }
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === keys.SOFT_DROP) setIsSoftDropping(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [canReset, hardDrop, hold, isGameOver, isPaused, isPlaying, keys, movePiece, rotate, startGame]);

  useEffect(() => () => {
    cancelLock();
    clearDropTimer();
  }, [cancelLock, clearDropTimer]);

  const ghostY = currentPiece ? getGhostPosition(board, currentPiece) : null;

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
    elapsedTime,
    ghostY,
    isPaused,
    pauseGame,
    resumeGame,
    stopGame,
    startGame,
    movePiece,
    rotate,
    hardDrop,
    hold,
    receiveGarbage,
  };
}
