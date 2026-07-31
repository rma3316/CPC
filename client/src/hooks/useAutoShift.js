import { useEffect, useRef } from 'react';

const LEFT = 'left';
const RIGHT = 'right';
const MAX_INSTANT_MOVES = 100;
const MAX_REPEATS_PER_FRAME = 20;

function normalizeKey(key) {
  if (typeof key !== 'string') return '';
  return key.length === 1 ? key.toLowerCase() : key;
}

function isTypingTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'),
  );
}

/**
 * DAS/ARR 기반 좌우 자동 이동을 제공한다.
 * onMove는 'left' 또는 'right'를 받고, 이동할 수 없으면 false를 반환할 수 있다.
 */
export function useAutoShift({
  leftKey,
  rightKey,
  das,
  arr,
  enabled = true,
  onMove,
  ignoreTypingTarget = true,
}) {
  const timingRef = useRef({ das, arr, onMove });

  useEffect(() => {
    timingRef.current = { das, arr, onMove };
  }, [arr, das, onMove]);

  useEffect(() => {
    if (!enabled) return undefined;

    const normalizedLeftKey = normalizeKey(leftKey);
    const normalizedRightKey = normalizeKey(rightKey);
    const pressed = {
      [LEFT]: false,
      [RIGHT]: false,
    };
    let activeDirection = null;
    let frameId = null;
    let repeatAt = 0;
    let instantShiftDone = false;

    const cancelFrame = () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    };

    const reset = () => {
      pressed[LEFT] = false;
      pressed[RIGHT] = false;
      activeDirection = null;
      instantShiftDone = false;
      cancelFrame();
    };

    const move = (direction) => {
      if (typeof timingRef.current.onMove !== 'function') return false;
      return timingRef.current.onMove(direction);
    };

    const getDas = () => {
      const value = Number(timingRef.current.das);
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    };

    const getArr = () => {
      const value = Number(timingRef.current.arr);
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    };

    const requestNextFrame = (tick) => {
      if (frameId === null && activeDirection !== null) {
        frameId = requestAnimationFrame(tick);
      }
    };

    const tick = (timestamp) => {
      frameId = null;
      if (activeDirection === null) return;

      if (timestamp < repeatAt) {
        requestNextFrame(tick);
        return;
      }

      const repeatRate = getArr();
      if (repeatRate === 0) {
        if (!instantShiftDone) {
          instantShiftDone = true;
          for (let count = 0; count < MAX_INSTANT_MOVES; count += 1) {
            if (move(activeDirection) === false) break;
          }
        }
        // 벽에 닿은 뒤 낙하로 공간이 열리면 다음 프레임에 즉시 다시 이동한다.
        instantShiftDone = false;
        requestNextFrame(tick);
        return;
      }

      const dueMoves = Math.min(
        MAX_REPEATS_PER_FRAME,
        Math.floor((timestamp - repeatAt) / repeatRate) + 1,
      );
      for (let count = 0; count < dueMoves; count += 1) {
        if (move(activeDirection) === false) break;
      }
      repeatAt += dueMoves * repeatRate;
      if (repeatAt <= timestamp) repeatAt = timestamp + repeatRate;
      requestNextFrame(tick);
    };

    const activate = (direction) => {
      activeDirection = direction;
      instantShiftDone = false;
      repeatAt = performance.now() + getDas();
      move(direction);
      requestNextFrame(tick);
    };

    const directionForKey = (key) => {
      if (key === normalizedLeftKey) return LEFT;
      if (key === normalizedRightKey) return RIGHT;
      return null;
    };

    const handleKeyDown = (event) => {
      const direction = directionForKey(normalizeKey(event.key));
      if (direction === null) return;
      if (ignoreTypingTarget && isTypingTarget(event.target)) return;

      event.preventDefault();
      if (event.repeat || pressed[direction]) return;

      pressed[direction] = true;
      activate(direction);
    };

    const handleKeyUp = (event) => {
      const direction = directionForKey(normalizeKey(event.key));
      if (direction === null || !pressed[direction]) return;

      event.preventDefault();
      pressed[direction] = false;
      if (activeDirection !== direction) return;

      const oppositeDirection = direction === LEFT ? RIGHT : LEFT;
      if (pressed[oppositeDirection]) {
        activate(oppositeDirection);
      } else {
        activeDirection = null;
        instantShiftDone = false;
        cancelFrame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', reset);

    return () => {
      reset();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', reset);
    };
  }, [enabled, ignoreTypingTarget, leftKey, rightKey]);
}
