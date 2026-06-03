// ============================================================
//  GameBoard.jsx - 메인 게임 보드 캔버스 렌더링
//  담당: 개발자 C (UI 컴포넌트 담당)
// ============================================================

import { useRef, useEffect } from 'react';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  CELL_SIZE,
  PIECE_COLORS,
  PIECE_GLOW_COLORS,
} from '../game/constants';
import './GameBoard.css';

/**
 * @param {object} props
 * @param {number[][]} props.board - 보드 상태
 * @param {object|null} props.currentPiece - 현재 피스
 * @param {number|null} props.ghostY - 고스트 피스 Y 위치
 * @param {boolean} props.isPaused - 게임 일시정지 여부
 * @param {Function} props.onPauseGame - 게임 일시정지 핸들러
 * @param {Function} props.onResumeGame - 게임 재개 핸들러
 */
export default function GameBoard({ board, currentPiece, ghostY, isPaused, onPauseGame, onResumeGame }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // 윈도우 포커스 감지 (화면 밖으로 나갔을 때)
  useEffect(() => {
    const handleWindowBlur = () => {
      if (onPauseGame) onPauseGame();
    };
    
    // 필요시 포커스 복귀 이벤트도 처리할 수 있습니다.
    // const handleWindowFocus = () => {
    //   if (onResumeGame) onResumeGame();
    // };

    window.addEventListener('blur', handleWindowBlur);
    // window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      // window.removeEventListener('focus', handleWindowFocus);
    };
  }, [onPauseGame, onResumeGame]);

  // 보드 영역 포커스 아웃 감지 (게임 중 다른 UI 클릭 시)
  const handleBoardBlur = () => {
    if (onPauseGame) onPauseGame();
  };

  // 마우스 포인터가 게임창(보드) 내에서 벗어났을 때 감지
  const handleMouseLeave = () => {
    if (onPauseGame) onPauseGame();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = BOARD_WIDTH * CELL_SIZE;
    const height = BOARD_HEIGHT * CELL_SIZE;

    canvas.width = width;
    canvas.height = height;

    // 보드 배경
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, width, height);

    // 그리드
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, height);
      ctx.stroke();
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(width, y * CELL_SIZE);
      ctx.stroke();
    }

    // 고정된 블록 렌더링
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (board[y][x] !== 0) {
          drawCell(ctx, x, y, board[y][x]);
        }
      }
    }

    // 고스트 피스 렌더링
    if (currentPiece && ghostY !== null) {
      const shape = currentPiece.shape;
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (shape[row][col] !== 0) {
            const drawX = (currentPiece.x + col) * CELL_SIZE;
            const drawY = (ghostY + row) * CELL_SIZE;
            ctx.strokeStyle = PIECE_COLORS[shape[row][col]] + '66';
            ctx.lineWidth = 1;
            ctx.strokeRect(drawX + 1, drawY + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          }
        }
      }
    }

    // 현재 피스 렌더링
    if (currentPiece) {
      const shape = currentPiece.shape;
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (shape[row][col] !== 0) {
            const cellY = currentPiece.y + row;
            if (cellY >= 0) {
              drawCell(ctx, currentPiece.x + col, cellY, shape[row][col]);
            }
          }
        }
      }
    }
  }, [board, currentPiece, ghostY]);

  return (
    <div 
      className="game-board-wrapper" 
      ref={containerRef}
      tabIndex={0} 
      onBlur={handleBoardBlur}
      onMouseLeave={handleMouseLeave}
      style={{ outline: 'none' }} // 기본 포커스 아웃라인 제거 (D가 CSS로 처리 가능)
    >
      <canvas
        ref={canvasRef}
        className="game-board-canvas"
        id="main-game-canvas"
      />
      <div className="board-border" />
      
      {/* 일시정지 오버레이 */}
      {isPaused && (
        <div className="pause-overlay">
          <h2 className="title-glow">PAUSED</h2>
          <button className="btn-neon" onClick={onResumeGame}>RESUME</button>
        </div>
      )}
    </div>
  );
}

/** 셀 하나를 그립니다 (네온 글로우 효과 포함) */
function drawCell(ctx, x, y, type) {
  const px = x * CELL_SIZE;
  const py = y * CELL_SIZE;
  const color = PIECE_COLORS[type] || PIECE_COLORS[0];
  const glowColor = PIECE_GLOW_COLORS[type];

  // 글로우
  if (glowColor) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
  }

  // 메인 블록
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);

  // 하이라이트 (위쪽, 왼쪽)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, 2);
  ctx.fillRect(px + 1, py + 1, 2, CELL_SIZE - 2);

  // 그림자 (아래쪽, 오른쪽)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(px + 1, py + CELL_SIZE - 3, CELL_SIZE - 2, 2);
  ctx.fillRect(px + CELL_SIZE - 3, py + 1, 2, CELL_SIZE - 2);

  // 글로우 리셋
  ctx.shadowBlur = 0;
}
