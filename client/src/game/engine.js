// ============================================================
//  engine.js - 코어 게임 엔진 (순수 로직, React 비의존)
//  담당: 개발자 A (게임 엔진 담당)
// ============================================================

import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  LOCK_DELAY,
  MAX_LOCK_RESETS,
} from './constants.js';
import {
  TETROMINOS,
  SRS_WALL_KICKS,
  SRS_WALL_KICKS_I,
  ROTATION_NAMES,
  createBag,
} from './tetrominos.js';

// ---------- 보드 생성 ----------
export function createBoard() {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    new Array(BOARD_WIDTH).fill(0)
  );
}

// ---------- 충돌 검사 ----------
export function isValidPosition(board, shape, offsetX, offsetY) {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 0) {
        const newX = offsetX + col;
        const newY = offsetY + row;

        // 경계 검사
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
          return false;
        }
        // 상단 버퍼 위는 허용
        if (newY < 0) continue;

        // 보드 충돌 검사
        if (board[newY][newX] !== 0) {
          return false;
        }
      }
    }
  }
  return true;
}

// ---------- 피스를 보드에 고정 ----------
export function lockPiece(board, piece) {
  const newBoard = board.map(row => [...row]);
  const shape = piece.shape;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 0) {
        const y = piece.y + row;
        const x = piece.x + col;
        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
          newBoard[y][x] = shape[row][col];
        }
      }
    }
  }
  return newBoard;
}

// ---------- 줄 제거 ----------
export function clearLines(board) {
  const newBoard = board.filter(row => row.some(cell => cell === 0));
  const linesCleared = BOARD_HEIGHT - newBoard.length;

  // 위에 빈 줄 추가
  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(new Array(BOARD_WIDTH).fill(0));
  }

  return { board: newBoard, linesCleared };
}

// ---------- SRS 회전 ----------
export function rotatePiece(board, piece, direction) {
  // direction: 1 = 시계 방향(CW), -1 = 반시계 방향(CCW)
  const pieceName = piece.name;
  const tetromino = TETROMINOS[pieceName];
  const fromState = piece.rotation;
  const toState = (fromState + direction + 4) % 4;
  const newShape = tetromino.rotations[toState];

  // 월킥 키 생성
  const kickKey = `${ROTATION_NAMES[fromState]}>${ROTATION_NAMES[toState]}`;
  const kicks = pieceName === 'I' ? SRS_WALL_KICKS_I[kickKey] : SRS_WALL_KICKS[kickKey];

  if (!kicks) return null;

  // 5개의 오프셋 테스트
  for (const [dx, dy] of kicks) {
    if (isValidPosition(board, newShape, piece.x + dx, piece.y - dy)) {
      return {
        ...piece,
        shape: newShape,
        rotation: toState,
        x: piece.x + dx,
        y: piece.y - dy,
      };
    }
  }

  return null; // 회전 불가
}

// ---------- 피스 생성 ----------
export function spawnPiece(pieceName) {
  const tetromino = TETROMINOS[pieceName];
  const shape = tetromino.rotations[0];
  const x = Math.floor((BOARD_WIDTH - shape[0].length) / 2);
  const y = pieceName === 'I' ? -1 : 0;

  return {
    name: pieceName,
    shape,
    rotation: 0,
    x,
    y,
  };
}

// ---------- 하드 드롭 위치 계산 ----------
export function getGhostPosition(board, piece) {
  let ghostY = piece.y;
  while (isValidPosition(board, piece.shape, piece.x, ghostY + 1)) {
    ghostY++;
  }
  return ghostY;
}

// ---------- 쓰레기 줄 추가 ----------
export function addGarbageLines(board, garbageLines) {
  const newBoard = board.slice(garbageLines.length);
  return [...newBoard, ...garbageLines];
}

// ---------- T-Spin 판별 ----------
export function isTSpin(board, piece) {
  if (piece.name !== 'T') return false;

  // T 피스의 중심 좌표
  const cx = piece.x + 1;
  const cy = piece.y + 1;

  // 네 모서리 확인
  const corners = [
    [cx - 1, cy - 1],
    [cx + 1, cy - 1],
    [cx - 1, cy + 1],
    [cx + 1, cy + 1],
  ];

  let filledCorners = 0;
  for (const [x, y] of corners) {
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) {
      filledCorners++;
    } else if (board[y][x] !== 0) {
      filledCorners++;
    }
  }

  return filledCorners >= 3;
}

// ---------- 피스 큐 관리 (7-bag) ----------
export class PieceQueue {
  constructor() {
    this.queue = [];
    this._fillQueue();
  }

  _fillQueue() {
    while (this.queue.length < 14) {
      this.queue.push(...createBag());
    }
  }

  next() {
    const piece = this.queue.shift();
    this._fillQueue();
    return piece;
  }

  /** 다음 N개 피스 미리보기 */
  preview(count = 5) {
    return this.queue.slice(0, count);
  }
}
