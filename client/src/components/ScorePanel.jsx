import { useRef, useEffect } from 'react';
import { TETROMINOS } from '../game/tetrominos';
import { PIECE_COLORS } from '../game/constants';

/**
 * @param {object} props
 * @param {number} props.score
 * @param {number} props.level
 * @param {number} props.totalLines
 * @param {number} props.combo
 * @param {number} props.backToBack
 * @param {string|null} props.holdPiece - 홀드 중인 피스 이름
 * @param {string[]} props.nextPieces - 다음 피스 이름 목록 (최대 5)
 * @param {number} props.elapsedTime - 경과 시간(ms)
 * @param {object} props.gameStats - 실시간 플레이 통계
 */
export default function ScorePanel({ score, level, totalLines, combo, backToBack = 0, holdPiece, nextPieces, elapsedTime = 0, gameStats }) {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Hold */}
      <div className="glass-panel p-4 flex flex-col items-center shadow-md">
        <h3 className="font-headline font-bold text-sky-800 text-sm tracking-widest mb-3">HOLD</h3>
        <div className="bg-white/40 border border-sky-100 rounded-lg p-3 shadow-inner w-full flex justify-center">
          <PiecePreview pieceName={holdPiece} />
        </div>
      </div>

      {/* Stats */}
      <div className="glass-panel p-5 flex flex-col gap-4 shadow-md flex-1 justify-center">
        <div className="flex flex-col items-center bg-white/40 rounded-xl p-3 border border-sky-100/50 shadow-sm">
          <span className="font-headline text-xs font-bold text-sky-600 mb-1 tracking-wider">SCORE</span>
          <span className="font-headline text-3xl font-bold text-sky-950">{score.toLocaleString()}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center bg-white/40 rounded-xl p-3 border border-sky-100/50 shadow-sm">
            <span className="font-headline text-xs font-bold text-sky-600 mb-1 tracking-wider">LEVEL</span>
            <span className="font-headline text-2xl font-bold text-sky-900">{level}</span>
          </div>
          <div className="flex flex-col items-center bg-white/40 rounded-xl p-3 border border-sky-100/50 shadow-sm">
            <span className="font-headline text-xs font-bold text-sky-600 mb-1 tracking-wider">LINES</span>
            <span className="font-headline text-2xl font-bold text-sky-900">{totalLines}</span>
          </div>
        </div>

        <div className="flex flex-col items-center bg-white/40 rounded-xl p-3 border border-sky-100/50 shadow-sm">
          <span className="font-headline text-xs font-bold text-sky-600 mb-1 tracking-wider">TIME</span>
          <span className="font-headline text-xl font-bold text-sky-900 tabular-nums">{formatElapsedTime(elapsedTime)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center rounded-xl border border-sky-100/50 bg-white/40 p-2 shadow-sm">
            <span className="font-headline text-[10px] font-bold tracking-wider text-sky-600">PIECES</span>
            <span className="font-headline text-lg font-bold text-sky-900">{gameStats?.pieces || 0}</span>
          </div>
          <div className="flex flex-col items-center rounded-xl border border-sky-100/50 bg-white/40 p-2 shadow-sm">
            <span className="font-headline text-[10px] font-bold tracking-wider text-sky-600">PPS</span>
            <span className="font-headline text-lg font-bold text-sky-900">{(gameStats?.pps || 0).toFixed(2)}</span>
          </div>
        </div>

        {backToBack > 1 && (
          <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-100/80 px-3 py-2 text-violet-700 shadow-sm">
            <span className="font-headline text-xs font-bold tracking-wider">BACK-TO-BACK</span>
            <span className="font-headline text-lg font-black">×{backToBack}</span>
          </div>
        )}

        {combo > 1 && (
          <div className="mt-2 flex flex-col items-center bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl p-3 border border-orange-200 shadow-sm animate-pulse-fast">
            <span className="font-headline text-xs font-bold text-orange-600 mb-1 tracking-wider">COMBO</span>
            <span className="font-headline text-3xl font-bold text-orange-600">{combo}x</span>
          </div>
        )}
      </div>

      {/* Next Pieces */}
      <div className="glass-panel p-4 flex flex-col items-center shadow-md">
        <h3 className="font-headline font-bold text-sky-800 text-sm tracking-widest mb-3">NEXT</h3>
        <div className="flex flex-col gap-2 w-full">
          {nextPieces?.slice(0, 5).map((name, i) => (
            <div key={i} className={`bg-white/40 border border-sky-100 rounded-lg flex justify-center items-center shadow-inner ${i === 0 ? 'p-3' : 'p-2'}`}>
              <PiecePreview pieceName={name} small={i > 0} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatElapsedTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  const tenths = Math.floor((milliseconds % 1000) / 100);
  return `${minutes}:${seconds}.${tenths}`;
}

/** 작은 캔버스에 피스 미리보기를 그립니다 */
function PiecePreview({ pieceName, small = false }) {
  const canvasRef = useRef(null);
  const cellSize = small ? 14 : 20;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!pieceName || !TETROMINOS[pieceName]) {
      canvas.width = cellSize * 4;
      canvas.height = cellSize * 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const shape = TETROMINOS[pieceName].rotations[0];
    const rows = shape.length;
    const cols = shape[0].length;

    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c] !== 0) {
          ctx.fillStyle = PIECE_COLORS[shape[r][c]];
          // 글로우 효과 유지
          ctx.shadowColor = PIECE_COLORS[shape[r][c]];
          ctx.shadowBlur = 4;
          
          ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2);
          
          // 하이라이트 효과
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, 2);
          ctx.fillRect(c * cellSize + 1, r * cellSize + 1, 2, cellSize - 2);
        }
      }
    }
  }, [pieceName, cellSize]);

  return (
    <div className={`flex items-center justify-center ${small ? 'opacity-80' : ''}`}>
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
