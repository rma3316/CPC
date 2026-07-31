import { useRef, useEffect } from 'react';
import { BOARD_WIDTH, BOARD_HEIGHT, MINI_CELL_SIZE, PIECE_COLORS } from '../game/constants';

/**
 * 상대방 보드를 축소된 캔버스로 렌더링합니다.
 *
 * @param {object} props
 * @param {number[][]} props.board - 상대 보드 상태
 * @param {string} props.nickname - 상대 닉네임
 * @param {boolean} props.alive - 생존 여부
 * @param {number} props.score - 상대 점수
 * @param {number} props.lines - 상대가 제거한 줄 수
 */
export default function MiniBoard({ board, nickname, alive, isEliminated, score = 0, lines = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = BOARD_WIDTH * MINI_CELL_SIZE;
    const height = BOARD_HEIGHT * MINI_CELL_SIZE;

    canvas.width = width;
    canvas.height = height;

    // 배경 (밝게)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, 0, width, height);

    if (!board) return;

    // 블록 렌더링
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (board[y]?.[x]) {
          ctx.fillStyle = PIECE_COLORS[board[y][x]] || '#888';
          ctx.fillRect(
            x * MINI_CELL_SIZE,
            y * MINI_CELL_SIZE,
            MINI_CELL_SIZE - 1,
            MINI_CELL_SIZE - 1
          );
        }
      }
    }

    // 탈락 오버레이
    if (isEliminated || !alive) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ef4444'; // Tailwind red-500
      ctx.font = `bold ${MINI_CELL_SIZE * 2.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 텍스트에 하얀 테두리 추가해서 잘 보이게
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeText('OUT', width / 2, height / 2);
      ctx.fillText('OUT', width / 2, height / 2);
    }
  }, [board, alive, isEliminated]);

  return (
    <div className={`flex flex-col items-center bg-white/30 backdrop-blur-sm border border-white/50 rounded-xl p-2 shadow-sm relative transition-opacity ${!alive ? 'opacity-70 grayscale-[30%]' : ''}`}>
      <canvas ref={canvasRef} className="block rounded-md overflow-hidden bg-transparent border border-sky-100/50" />
      <span className="font-headline font-bold text-sm text-sky-900 mt-2 truncate w-full text-center px-1">
        {nickname || '???'}
      </span>
      <span className="font-headline text-[10px] text-sky-700 tabular-nums">
        {score.toLocaleString()} P · {lines} L
      </span>
    </div>
  );
}
