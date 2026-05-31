// ============================================================
//  MiniBoard.jsx - 상대방 미니 보드
//  담당: 개발자 C (UI 컴포넌트 담당)
// ============================================================

import { useRef, useEffect } from 'react';
import { BOARD_WIDTH, BOARD_HEIGHT, MINI_CELL_SIZE, PIECE_COLORS } from '../game/constants';
import './MiniBoard.css';

/**
 * 상대방 보드를 축소된 캔버스로 렌더링합니다.
 *
 * @param {object} props
 * @param {number[][]} props.board - 상대 보드 상태
 * @param {string} props.nickname - 상대 닉네임
 * @param {boolean} props.alive - 생존 여부
 * @param {boolean} [props.isEliminated] - 탈락 여부
 */
export default function MiniBoard({ board, nickname, alive, isEliminated }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = BOARD_WIDTH * MINI_CELL_SIZE;
    const height = BOARD_HEIGHT * MINI_CELL_SIZE;

    canvas.width = width;
    canvas.height = height;

    // 배경
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
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
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ff3030';
      ctx.font = `bold ${MINI_CELL_SIZE * 2}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-display')}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('OUT', width / 2, height / 2);
    }
  }, [board, alive, isEliminated]);

  return (
    <div className={`mini-board ${!alive ? 'eliminated' : ''}`}>
      <canvas ref={canvasRef} className="mini-board-canvas" />
      <span className="mini-board-name">{nickname || '???'}</span>
    </div>
  );
}
