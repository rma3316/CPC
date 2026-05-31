// ============================================================
//  ScorePanel.jsx - 점수, 레벨, 다음 피스, 홀드 표시 패널
//  담당: 개발자 C (UI 컴포넌트 담당)
// ============================================================

import { useRef, useEffect } from 'react';
import { TETROMINOS } from '../game/tetrominos';
import { PIECE_COLORS, CELL_SIZE } from '../game/constants';
import './ScorePanel.css';

/**
 * @param {object} props
 * @param {number} props.score
 * @param {number} props.level
 * @param {number} props.totalLines
 * @param {number} props.combo
 * @param {string|null} props.holdPiece - 홀드 중인 피스 이름
 * @param {string[]} props.nextPieces - 다음 피스 이름 목록 (최대 5)
 */
export default function ScorePanel({ score, level, totalLines, combo, holdPiece, nextPieces }) {
  return (
    <div className="score-panel">
      {/* Hold */}
      <div className="glass-card-sm panel-section">
        <h3 className="section-title">HOLD</h3>
        <PiecePreview pieceName={holdPiece} />
      </div>

      {/* Stats */}
      <div className="glass-card-sm panel-section stats-section">
        <div className="stat-item">
          <span className="stat-label">SCORE</span>
          <span className="stat-value">{score.toLocaleString()}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">LEVEL</span>
          <span className="stat-value">{level}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">LINES</span>
          <span className="stat-value">{totalLines}</span>
        </div>
        {combo > 1 && (
          <div className="stat-item combo">
            <span className="stat-label">COMBO</span>
            <span className="stat-value combo-value">{combo}x</span>
          </div>
        )}
      </div>

      {/* Next Pieces */}
      <div className="glass-card-sm panel-section">
        <h3 className="section-title">NEXT</h3>
        <div className="next-pieces">
          {nextPieces?.slice(0, 5).map((name, i) => (
            <PiecePreview key={i} pieceName={name} small={i > 0} />
          ))}
        </div>
      </div>
    </div>
  );
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
          ctx.shadowColor = PIECE_COLORS[shape[r][c]];
          ctx.shadowBlur = 6;
          ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2);
          ctx.shadowBlur = 0;
        }
      }
    }
  }, [pieceName, cellSize]);

  return (
    <div className={`piece-preview ${small ? 'small' : ''}`}>
      <canvas ref={canvasRef} />
    </div>
  );
}
