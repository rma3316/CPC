// ============================================================
//  useTetris.js - 테트리스 게임 상태 관리 React Hook
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAutoShift } from './useAutoShift';
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
  DEFAULT_HANDLING,
  INFINITE_SDF,
  LOCK_DELAY,
  MAX_LOCK_RESETS,
  KEY_BINDINGS,
} from '../game/constants';

const NORMAL_LINE_SCORES = [0, 100, 300, 500, 800];
const T_SPIN_SCORES = [400, 800, 1200, 1600];
const PERFECT_CLEAR_SCORES = [0, 800, 1200, 1800, 2000];
const GARBAGE_WARNING_DELAY = 700;

function createEmptyPerformanceStats() {
  return {
    pieces: 0,
    maxCombo: 0,
    maxBackToBack: 0,
    tSpins: 0,
    tetrises: 0,
    perfectClears: 0,
  };
}

const LINE_CLEAR_LABELS = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS'];

function createClearMessage({ linesCleared, isTSpin, isPerfectClear, isBackToBack, backToBack, combo }) {
  const lineLabel = LINE_CLEAR_LABELS[linesCleared] || `${linesCleared} LINES`;
  const primary = isPerfectClear
    ? 'PERFECT CLEAR'
    : isTSpin
      ? `T-SPIN ${lineLabel}`
      : lineLabel;
  const details = [];
  if (isBackToBack) details.push(`BACK-TO-BACK ×${backToBack}`);
  if (combo > 1) details.push(`${combo} COMBO`);

  return {
    primary,
    secondary: details.join(' · '),
    tone: isPerfectClear ? 'perfect' : isTSpin ? 'tspin' : linesCleared === 4 ? 'tetris' : 'clear',
  };
}

function normalizeInputKey(key) {
  if (typeof key !== 'string') return '';
  return key.length === 1 ? key.toLowerCase() : key;
}

function getLineClearScore(linesCleared, isTSpin, level, combo, isBackToBack, isPerfectClear) {
  const table = isTSpin ? T_SPIN_SCORES : NORMAL_LINE_SCORES;
  const rawBaseScore = table[Math.min(linesCleared, table.length - 1)] || 0;
  const baseScore = isBackToBack ? Math.floor(rawBaseScore * 1.5) : rawBaseScore;
  const comboBonus = linesCleared > 0 ? Math.max(0, combo - 1) * 50 : 0;
  const perfectClearBonus = isPerfectClear
    ? PERFECT_CLEAR_SCORES[Math.min(linesCleared, PERFECT_CLEAR_SCORES.length - 1)]
    : 0;
  return (baseScore + comboBonus + perfectClearBonus) * level;
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
  handling = DEFAULT_HANDLING,
  canReset = true,
  canPause = true,
  inputEnabled = true,
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
  const [countdown, setCountdown] = useState(null);
  const [backToBack, setBackToBack] = useState(0);
  const [actionMessage, setActionMessage] = useState(null);
  const [incomingGarbage, setIncomingGarbage] = useState(0);
  const [performanceStats, setPerformanceStats] = useState(createEmptyPerformanceStats);
  const isCountdownBlocking = typeof countdown === 'number';

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
  const backToBackRef = useRef(0);
  const incomingGarbageRef = useRef(0);
  const garbageTimersRef = useRef(new Set());
  const actionMessageTimerRef = useRef(null);
  const dangerWasActiveRef = useRef(false);
  const performanceStatsRef = useRef(createEmptyPerformanceStats());

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

  const clearPendingGarbage = useCallback(() => {
    for (const timer of garbageTimersRef.current) clearTimeout(timer);
    garbageTimersRef.current.clear();
    incomingGarbageRef.current = 0;
    setIncomingGarbage(0);
  }, []);

  const clearActionMessage = useCallback(() => {
    if (actionMessageTimerRef.current) clearTimeout(actionMessageTimerRef.current);
    actionMessageTimerRef.current = null;
    setActionMessage(null);
  }, []);

  const showActionMessage = useCallback((message) => {
    if (actionMessageTimerRef.current) clearTimeout(actionMessageTimerRef.current);
    setActionMessage(message);
    actionMessageTimerRef.current = setTimeout(() => {
      actionMessageTimerRef.current = null;
      setActionMessage(null);
    }, 1400);
  }, []);

  const addScore = useCallback((points) => {
    if (points <= 0) return;
    scoreRef.current += points;
    setScore(scoreRef.current);
  }, []);

  const getElapsedTime = useCallback(() => {
    if (!gameStartedAtRef.current) return 0;
    const activePauseDuration = pausedAtRef.current ? Date.now() - pausedAtRef.current : 0;
    return Math.max(
      0,
      Date.now() - gameStartedAtRef.current - totalPausedTimeRef.current - activePauseDuration,
    );
  }, []);

  const getGameStats = useCallback(() => {
    const finalElapsedTime = getElapsedTime();
    const pieces = performanceStatsRef.current.pieces;
    return {
      ...performanceStatsRef.current,
      score: scoreRef.current,
      lines: totalLinesRef.current,
      level: levelRef.current,
      elapsedTime: finalElapsedTime,
      pps: finalElapsedTime > 0 ? pieces / (finalElapsedTime / 1000) : 0,
    };
  }, [getElapsedTime]);

  const finishGame = useCallback((reason = 'top-out') => {
    if (isGameOverRef.current) return;

    cancelLock();
    clearDropTimer();
    clearPendingGarbage();
    clearActionMessage();
    isGameOverRef.current = true;
    isPlayingRef.current = false;
    isPausedRef.current = false;
    setIsGameOver(true);
    setIsPlaying(false);
    setIsPaused(false);
    setIsSoftDropping(false);
    setCountdown(null);
    const finalStats = getGameStats();
    setElapsedTime(finalStats.elapsedTime);
    onSound?.(reason === 'sprint-complete' ? 'success' : 'gameOver');
    onGameOver?.({ reason, mode: gameModeRef.current, stats: finalStats });
  }, [cancelLock, clearActionMessage, clearDropTimer, clearPendingGarbage, getGameStats, onGameOver, onSound]);

  const stopGame = useCallback(() => {
    if (!isPlayingRef.current) return;
    cancelLock();
    clearDropTimer();
    clearPendingGarbage();
    clearActionMessage();
    isPlayingRef.current = false;
    isGameOverRef.current = true;
    isPausedRef.current = false;
    setIsPlaying(false);
    setIsGameOver(true);
    setIsPaused(false);
    setIsSoftDropping(false);
    setCountdown(null);
    setElapsedTime(getElapsedTime());
  }, [cancelLock, clearActionMessage, clearDropTimer, clearPendingGarbage, getElapsedTime]);

  const startGame = useCallback(({ mode } = {}) => {
    cancelLock();
    clearDropTimer();
    clearPendingGarbage();
    clearActionMessage();

    const newBoard = createBoard();
    const nextMode = mode || gameModeRef.current || 'marathon';
    pieceQueueRef.current = new PieceQueue();
    gameModeRef.current = nextMode;
    lockResetsRef.current = 0;
    lastActionRef.current = null;
    gameStartedAtRef.current = null;
    pausedAtRef.current = null;
    totalPausedTimeRef.current = 0;
    boardRef.current = newBoard;
    scoreRef.current = 0;
    levelRef.current = 1;
    totalLinesRef.current = 0;
    comboRef.current = 0;
    backToBackRef.current = 0;
    dangerWasActiveRef.current = false;
    performanceStatsRef.current = createEmptyPerformanceStats();
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
    setCountdown(3);
    setCombo(0);
    setBackToBack(0);
    setPerformanceStats(createEmptyPerformanceStats());

    const firstPieceName = pieceQueueRef.current.next();
    const firstPiece = spawnPiece(firstPieceName);
    currentPieceRef.current = firstPiece;
    setCurrentPiece(firstPiece);
    setNextPieces(pieceQueueRef.current.preview(5));
    onSound?.('countdown');
    onStateUpdate?.({ board: newBoard, score: 0, lines: 0 });
  }, [cancelLock, clearActionMessage, clearDropTimer, clearPendingGarbage, onSound, onStateUpdate]);

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
    if (lockedAboveTop) {
      currentPieceRef.current = null;
      setCurrentPiece(null);
      finishGame('top-out');
      return;
    }

    const tSpin = lastActionRef.current === 'rotate' && checkTSpin(currentBoard, piece);
    const lockedBoard = lockPiece(currentBoard, piece);
    const { board: newBoard, linesCleared } = clearLines(lockedBoard);

    const newCombo = linesCleared > 0 ? comboRef.current + 1 : 0;
    const newTotal = totalLinesRef.current + linesCleared;
    const newLevel = Math.floor(newTotal / LINES_PER_LEVEL) + 1;
    const isPerfectClear = linesCleared > 0
      && newBoard.every(row => row.every(cell => cell === 0));
    const qualifiesForBackToBack = linesCleared > 0 && (linesCleared === 4 || tSpin);
    const isBackToBack = qualifiesForBackToBack && backToBackRef.current > 0;
    const newBackToBack = qualifiesForBackToBack
      ? backToBackRef.current + 1
      : linesCleared > 0
        ? 0
        : backToBackRef.current;
    const gainedScore = getLineClearScore(
      linesCleared,
      tSpin,
      levelRef.current,
      newCombo,
      isBackToBack,
      isPerfectClear,
    );

    const newPerformanceStats = {
      pieces: performanceStatsRef.current.pieces + 1,
      maxCombo: Math.max(performanceStatsRef.current.maxCombo, newCombo),
      maxBackToBack: Math.max(performanceStatsRef.current.maxBackToBack, newBackToBack),
      tSpins: performanceStatsRef.current.tSpins + (tSpin && linesCleared > 0 ? 1 : 0),
      tetrises: performanceStatsRef.current.tetrises + (linesCleared === 4 ? 1 : 0),
      perfectClears: performanceStatsRef.current.perfectClears + (isPerfectClear ? 1 : 0),
    };

    comboRef.current = newCombo;
    performanceStatsRef.current = newPerformanceStats;
    backToBackRef.current = newBackToBack;
    totalLinesRef.current = newTotal;
    levelRef.current = newLevel;
    boardRef.current = newBoard;
    setCombo(newCombo);
    setPerformanceStats(newPerformanceStats);
    setBackToBack(newBackToBack);
    setTotalLines(newTotal);
    setLevel(newLevel);
    setBoard(newBoard);
    addScore(gainedScore);

    if (linesCleared === 0) onSound?.('lock');
    if (linesCleared > 0) {
      const soundName = isPerfectClear
        ? 'perfectClear'
        : tSpin
          ? 'tSpin'
          : `line${linesCleared}`;
      onSound?.(soundName);
      if (isBackToBack) onSound?.('backToBack');
      if (newCombo > 1) onSound?.('combo', { level: newCombo });
      showActionMessage(createClearMessage({
        linesCleared,
        isTSpin: tSpin,
        isPerfectClear,
        isBackToBack,
        backToBack: newBackToBack,
        combo: newCombo,
      }));
      onLineCleared?.({
        linesCleared,
        isTSpin: tSpin,
        isPerfectClear,
        isBackToBack,
        backToBack: newBackToBack,
        combo: newCombo,
        score: scoreRef.current,
      });
    }

    onStateUpdate?.({
      board: newBoard,
      score: scoreRef.current,
      lines: newTotal,
    });

    if (gameModeRef.current === 'sprint' && newTotal >= 40) {
      finishGame('sprint-complete');
      return;
    }

    spawnNext();
  }, [addScore, cancelLock, finishGame, onLineCleared, onSound, onStateUpdate, showActionMessage, spawnNext]);

  const startLockTimer = useCallback(() => {
    if (isPausedRef.current || isGameOverRef.current || lockTimerRef.current) return;
    lockTimerRef.current = setTimeout(() => {
      lockTimerRef.current = null;
      lock();
    }, LOCK_DELAY);
  }, [lock]);

  const softDropToBottom = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece || isGameOverRef.current || isPausedRef.current) return 0;

    const ghostY = getGhostPosition(boardRef.current, piece);
    const distance = Math.max(0, ghostY - piece.y);
    if (distance > 0) {
      const droppedPiece = { ...piece, y: ghostY };
      currentPieceRef.current = droppedPiece;
      setCurrentPiece(droppedPiece);
      lastActionRef.current = 'move';
      addScore(distance);
    }
    startLockTimer();
    return distance;
  }, [addScore, startLockTimer]);

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

      if (dx !== 0) onSound?.('move');
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
  }, [addScore, cancelLock, onSound, startLockTimer]);

  const handleAutoShift = useCallback((direction) => (
    movePiece(direction === 'left' ? -1 : 1, 0)
  ), [movePiece]);

  useAutoShift({
    leftKey: keys.MOVE_LEFT,
    rightKey: keys.MOVE_RIGHT,
    das: handling.das,
    arr: handling.arr,
    enabled: isPlaying && !isGameOver && !isPaused && !isCountdownBlocking && inputEnabled,
    onMove: handleAutoShift,
  });

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

    const queuedLines = garbageLines.slice(-20).map(row => Array.isArray(row) ? [...row] : []);
    incomingGarbageRef.current += queuedLines.length;
    setIncomingGarbage(incomingGarbageRef.current);
    onSound?.('garbageWarning');

    const timer = setTimeout(() => {
      garbageTimersRef.current.delete(timer);
      incomingGarbageRef.current = Math.max(0, incomingGarbageRef.current - queuedLines.length);
      setIncomingGarbage(incomingGarbageRef.current);
      if (isGameOverRef.current) return;

      const newBoard = addGarbageLines(boardRef.current, queuedLines);
      boardRef.current = newBoard;
      setBoard(newBoard);
      onSound?.('garbage');
      onStateUpdate?.({ board: newBoard, score: scoreRef.current, lines: totalLinesRef.current });

      const piece = currentPieceRef.current;
      if (piece && !isValidPosition(newBoard, piece.shape, piece.x, piece.y)) {
        finishGame('garbage-top-out');
      }
    }, GARBAGE_WARNING_DELAY);

    garbageTimersRef.current.add(timer);
  }, [finishGame, onSound, onStateUpdate]);

  const pauseGame = useCallback(() => {
    if (
      !isPlayingRef.current
      || isGameOverRef.current
      || isPausedRef.current
      || isCountdownBlocking
    ) return;
    cancelLock();
    setIsSoftDropping(false);
    pausedAtRef.current = Date.now();
    if (gameStartedAtRef.current) {
      setElapsedTime(pausedAtRef.current - gameStartedAtRef.current - totalPausedTimeRef.current);
    }
    isPausedRef.current = true;
    setIsPaused(true);
  }, [cancelLock, isCountdownBlocking]);

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
    if (!isPlaying || isGameOver || !canPause || !inputEnabled || isCountdownBlocking) {
      return undefined;
    }

    const handlePauseKey = (event) => {
      const tagName = event.target?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)) return;
      if (normalizeInputKey(event.key) !== keys.PAUSE || event.repeat) return;

      event.preventDefault();
      if (isPausedRef.current) resumeGame();
      else pauseGame();
    };

    window.addEventListener('keydown', handlePauseKey);
    return () => window.removeEventListener('keydown', handlePauseKey);
  }, [canPause, inputEnabled, isCountdownBlocking, isGameOver, isPlaying, keys.PAUSE, pauseGame, resumeGame]);

  useEffect(() => {
    if (!isPlaying || countdown === null) return undefined;

    const delay = countdown === 'GO' ? 500 : 700;
    const timer = setTimeout(() => {
      if (countdown === 'GO') {
        setCountdown(null);
        return;
      }

      if (countdown > 1) {
        setCountdown(countdown - 1);
        onSound?.('countdown');
        return;
      }

      gameStartedAtRef.current = Date.now();
      setCountdown('GO');
      onSound?.('go');
    }, delay);

    return () => clearTimeout(timer);
  }, [countdown, isPlaying, onSound]);

  useEffect(() => {
    if (!isPlaying || isGameOver || isPaused || !gameStartedAtRef.current) return undefined;
    const updateElapsedTime = () => {
      setElapsedTime(Date.now() - gameStartedAtRef.current - totalPausedTimeRef.current);
    };
    updateElapsedTime();
    const timer = setInterval(updateElapsedTime, 100);
    return () => clearInterval(timer);
  }, [countdown, isGameOver, isPaused, isPlaying]);

  useEffect(() => {
    clearDropTimer();
    if (!isPlaying || isGameOver || isPaused || isCountdownBlocking) return undefined;

    const configuredSdf = Number(handling.sdf);
    if (isSoftDropping && configuredSdf === INFINITE_SDF) {
      let frameId = null;
      const applyInfiniteSoftDrop = () => {
        softDropToBottom();
        frameId = requestAnimationFrame(applyInfiniteSoftDrop);
      };

      softDropToBottom();
      frameId = requestAnimationFrame(applyInfiniteSoftDrop);
      return () => cancelAnimationFrame(frameId);
    }

    const normalSpeed = Math.max(
      INITIAL_DROP_SPEED - (level - 1) * SPEED_DECREASE_PER_LEVEL,
      MIN_DROP_SPEED
    );
    const softDropFactor = Math.max(1, configuredSdf || DEFAULT_HANDLING.sdf);
    const speed = isSoftDropping
      ? Math.max(10, Math.floor(normalSpeed / softDropFactor))
      : normalSpeed;

    dropTimerRef.current = setInterval(() => {
      movePiece(0, 1, { softDrop: isSoftDropping });
    }, speed);

    return clearDropTimer;
  }, [
    clearDropTimer,
    handling.sdf,
    isCountdownBlocking,
    isGameOver,
    isPaused,
    isPlaying,
    isSoftDropping,
    level,
    movePiece,
    softDropToBottom,
  ]);

  useEffect(() => {
    if (!isPlaying || isGameOver || isPaused || isCountdownBlocking || !inputEnabled) return undefined;

    const isTypingTarget = () => {
      const tagName = document.activeElement?.tagName;
      return ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName);
    };

    const handleKeyDown = (event) => {
      if (isTypingTarget()) return;

      switch (normalizeInputKey(event.key)) {
        case keys.SOFT_DROP:
          event.preventDefault();
          if (!event.repeat) {
            if (Number(handling.sdf) === INFINITE_SDF) softDropToBottom();
            else movePiece(0, 1, { softDrop: true });
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
        case keys.ROTATE_180:
          event.preventDefault();
          if (!event.repeat) rotate(2);
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
      if (normalizeInputKey(event.key) === keys.SOFT_DROP) setIsSoftDropping(false);
    };

    const resetSoftDrop = () => setIsSoftDropping(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', resetSoftDrop);
    document.addEventListener('visibilitychange', resetSoftDrop);
    return () => {
      resetSoftDrop();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', resetSoftDrop);
      document.removeEventListener('visibilitychange', resetSoftDrop);
    };
  }, [
    canReset,
    handling.sdf,
    hardDrop,
    hold,
    inputEnabled,
    isCountdownBlocking,
    isGameOver,
    isPaused,
    isPlaying,
    keys,
    movePiece,
    rotate,
    softDropToBottom,
    startGame,
  ]);

  useEffect(() => () => {
    cancelLock();
    clearDropTimer();
    for (const timer of garbageTimersRef.current) clearTimeout(timer);
    garbageTimersRef.current.clear();
    if (actionMessageTimerRef.current) clearTimeout(actionMessageTimerRef.current);
  }, [cancelLock, clearDropTimer]);

  const isDanger = board.slice(0, 6).some(row => row.some(cell => cell !== 0));

  useEffect(() => {
    if (isDanger && isPlaying && !dangerWasActiveRef.current) onSound?.('danger');
    dangerWasActiveRef.current = isDanger;
  }, [isDanger, isPlaying, onSound]);

  const ghostY = currentPiece ? getGhostPosition(board, currentPiece) : null;
  const gameStats = {
    ...performanceStats,
    score,
    lines: totalLines,
    level,
    elapsedTime,
    pps: elapsedTime > 0 ? performanceStats.pieces / (elapsedTime / 1000) : 0,
  };

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
    backToBack,
    actionMessage,
    incomingGarbage,
    isDanger,
    gameStats,
    elapsedTime,
    countdown,
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
