import { useRef, useEffect } from 'react';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  CELL_SIZE,
  PIECE_COLORS,
  PIECE_GLOW_COLORS,
} from '../game/constants';

const ACTION_TONE_CLASSES = {
  clear: 'text-sky-100',
  tetris: 'text-cyan-200',
  tspin: 'text-fuchsia-200',
  perfect: 'text-amber-200',
};

/**
 * @param {object} props
 * @param {number[][]} props.board - 보드 상태
 * @param {object|null} props.currentPiece - 현재 피스
 * @param {number|null} props.ghostY - 고스트 피스 Y 위치
 * @param {number|string|null} props.countdown - 게임 시작 카운트다운
 * @param {{primary:string,secondary:string,tone:string}|null} props.actionMessage - 줄 제거 피드백
 * @param {number} props.incomingGarbage - 적용 대기 중인 가비지 줄 수
 * @param {boolean} props.isDanger - 보드 상단 위험 상태
 * @param {boolean} props.isPaused - 게임 일시정지 여부
 * @param {boolean} props.canPause - 현재 모드에서 일시정지를 허용하는지 여부
 * @param {Function} props.onPauseGame - 게임 일시정지 핸들러
 * @param {Function} props.onResumeGame - 게임 재개 핸들러
 * @param {Function} props.onOpenSettings - 설정 창 열기 핸들러
 * @param {Function} props.onGoHome - 홈으로 돌아가기 핸들러
 */
export default function GameBoard({ board, currentPiece, ghostY, countdown, actionMessage, incomingGarbage = 0, isDanger = false, isPaused, canPause = true, onPauseGame, onResumeGame, onOpenSettings, onGoHome }) {
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
      className={`relative flex items-center justify-center overflow-hidden rounded-xl border-[4px] bg-white/20 p-2 backdrop-blur-md shadow-2xl transition-colors duration-300 ${
        isDanger
          ? 'border-rose-400 shadow-rose-500/30'
          : 'border-white/60 shadow-sky-900/10'
      }`}
      ref={containerRef}
      tabIndex={0} 
      style={{ outline: 'none' }}
    >
      <canvas
        ref={canvasRef}
        className="block bg-transparent"
        id="main-game-canvas"
      />
      
      {isDanger && countdown === null && !isPaused && (
        <div className="pointer-events-none absolute top-3 z-10 rounded-full border border-rose-300 bg-rose-500/90 px-4 py-1 font-headline text-xs font-black tracking-[0.25em] text-white shadow-lg animate-pulse">
          DANGER
        </div>
      )}

      {incomingGarbage > 0 && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-600/90 px-3 py-2 text-white shadow-xl animate-pulse">
          <span className="material-symbols-outlined text-lg">keyboard_double_arrow_up</span>
          <span className="font-headline text-sm font-black">+{incomingGarbage} INCOMING</span>
        </div>
      )}

      {actionMessage && countdown === null && !isPaused && (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] z-10 flex flex-col items-center text-center drop-shadow-[0_3px_8px_rgba(2,6,23,0.9)] animate-scale-in">
          <span className={`font-headline text-4xl font-black tracking-wide ${ACTION_TONE_CLASSES[actionMessage.tone] || ACTION_TONE_CLASSES.clear}`}>
            {actionMessage.primary}
          </span>
          {actionMessage.secondary && (
            <span className="mt-1 font-headline text-sm font-bold tracking-widest text-white">
              {actionMessage.secondary}
            </span>
          )}
        </div>
      )}

      {countdown !== null && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-sky-950/20 backdrop-blur-[2px]">
          <span className="font-headline text-8xl font-black text-white drop-shadow-[0_6px_18px_rgba(3,105,161,0.8)] animate-scale-in">
            {countdown === 'GO' ? 'GO!' : countdown}
          </span>
        </div>
      )}

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
