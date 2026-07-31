import { useRef, useEffect } from 'react';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  CELL_SIZE,
  PIECE_COLORS,
  PIECE_GLOW_COLORS,
} from '../game/constants';

/**
 * @param {object} props
 * @param {number[][]} props.board - 보드 상태
 * @param {object|null} props.currentPiece - 현재 피스
 * @param {number|null} props.ghostY - 고스트 피스 Y 위치
 * @param {boolean} props.isPaused - 게임 일시정지 여부
 * @param {boolean} props.canPause - 현재 모드에서 일시정지를 허용하는지 여부
 * @param {Function} props.onPauseGame - 게임 일시정지 핸들러
 * @param {Function} props.onResumeGame - 게임 재개 핸들러
 * @param {Function} props.onOpenSettings - 설정 창 열기 핸들러
 * @param {Function} props.onGoHome - 홈으로 돌아가기 핸들러
 */
export default function GameBoard({ board, currentPiece, ghostY, isPaused, canPause = true, onPauseGame, onResumeGame, onOpenSettings, onGoHome }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // 윈도우 포커스 감지 (브라우저 탭을 벗어났을 때만 일시정지)
  useEffect(() => {
    const handleWindowBlur = () => {
      if (canPause && onPauseGame) onPauseGame();
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [canPause, onPauseGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = BOARD_WIDTH * CELL_SIZE;
    const height = BOARD_HEIGHT * CELL_SIZE;

    canvas.width = width;
    canvas.height = height;

    // 보드 배경 (밝게 변경)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, 0, width, height);

    // 그리드 (밝은 톤)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
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
            ctx.strokeStyle = PIECE_COLORS[shape[row][col]] + 'AA'; // 고스트 진하게
            ctx.lineWidth = 2;
            ctx.strokeRect(drawX + 1, drawY + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            ctx.fillStyle = PIECE_COLORS[shape[row][col]] + '33'; // 내부 연하게
            ctx.fillRect(drawX + 1, drawY + 1, CELL_SIZE - 2, CELL_SIZE - 2);
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
      className="relative flex items-center justify-center p-2 bg-white/20 backdrop-blur-md border-[4px] border-white/60 rounded-xl shadow-2xl shadow-sky-900/10 overflow-hidden" 
      ref={containerRef}
      tabIndex={0} 
      style={{ outline: 'none' }}
    >
      <canvas
        ref={canvasRef}
        className="block bg-transparent"
        id="main-game-canvas"
      />
      
      {/* 일시정지 오버레이 */}
      {isPaused && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center z-20">
          <h2 className="font-headline text-4xl font-bold text-sky-900 mb-6 drop-shadow-md tracking-widest">PAUSED</h2>
          <div className="flex flex-col gap-3 w-48">
            <button className="glass-button !w-full h-12 rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition-transform" onClick={onResumeGame}>RESUME</button>
            <button className="glass-button !w-full h-12 rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition-transform text-sky-800 bg-white/60" onClick={onOpenSettings}>SETTINGS</button>
            <button className="glass-button !w-full h-12 rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition-transform border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300" onClick={onGoHome}>GIVE UP</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 셀 하나를 그립니다 */
function drawCell(ctx, x, y, type) {
  const px = x * CELL_SIZE;
  const py = y * CELL_SIZE;
  const color = PIECE_COLORS[type] || PIECE_COLORS[0];
  const glowColor = PIECE_GLOW_COLORS[type];

  // 블록 글로우 효과 조금 줄임 (밝은 배경이므로)
  if (glowColor) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
  }

  // 메인 블록
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);

  // 하이라이트 (위쪽, 왼쪽)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, 2);
  ctx.fillRect(px + 1, py + 1, 2, CELL_SIZE - 2);

  // 그림자 (아래쪽, 오른쪽) - 어두운색 약간 진하게
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(px + 1, py + CELL_SIZE - 3, CELL_SIZE - 2, 2);
  ctx.fillRect(px + CELL_SIZE - 3, py + 1, 2, CELL_SIZE - 2);

  // 글로우 리셋
  ctx.shadowBlur = 0;
}
