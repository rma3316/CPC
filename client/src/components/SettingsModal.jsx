import React, { useState, useEffect } from 'react';
import './SettingsModal.css';

const KEY_LABELS = {
  MOVE_LEFT: '왼쪽 이동',
  MOVE_RIGHT: '오른쪽 이동',
  SOFT_DROP: '소프트 드롭',
  HARD_DROP: '하드 드롭',
  ROTATE_CW: '시계 방향 회전',
  ROTATE_CCW: '반시계 방향 회전',
  HOLD: '홀드',
  RESET: '리셋 (싱글플레이)',
};

export default function SettingsModal({ isOpen, onClose, keys, updateKey, volume, setVolume }) {
  const [editingAction, setEditingAction] = useState(null);
  const [showKeySettings, setShowKeySettings] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEditingAction(null);
      setShowKeySettings(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!editingAction) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      const newKey = e.key === ' ' ? ' ' : e.key;
      updateKey(editingAction, newKey);
      setEditingAction(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingAction, updateKey]);

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="title-glow">설정 (Settings)</h2>
        
        <div className="settings-options" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {!showKeySettings ? (
            <>
              <div className="setting-item">
                <span>효과음 볼륨</span>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  className="range-neon" 
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                />
                <span style={{ marginLeft: '10px' }}>{volume}%</span>
              </div>
              
              <div className="setting-item" style={{ marginTop: '15px' }}>
                <span>조작키 설정</span>
                <button 
                  className="btn-neon small"
                  onClick={() => setShowKeySettings(true)}
                >
                  변경
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 style={{ color: '#00f0f0', marginBottom: '15px', textAlign: 'center' }}>조작키 설정</h3>
              
              {Object.entries(KEY_LABELS).map(([action, label]) => (
                <div className="setting-item" key={action} style={{ marginBottom: '10px' }}>
                  <span>{label}</span>
                  <button 
                    className={`btn-neon small ${editingAction === action ? 'editing' : ''}`}
                    onClick={() => setEditingAction(action)}
                    style={{ minWidth: '100px' }}
                  >
                    {editingAction === action ? '입력 대기중...' : (keys?.[action] === ' ' ? 'Space' : keys?.[action])}
                  </button>
                </div>
              ))}

              <button 
                className="btn-neon small" 
                onClick={() => {
                  setShowKeySettings(false);
                  setEditingAction(null);
                }} 
                style={{ marginTop: '15px', width: '100%' }}
              >
                뒤로 가기
              </button>
            </>
          )}
        </div>

        <button className="btn-neon purple" onClick={onClose} style={{ marginTop: '20px' }}>
          닫기
        </button>
      </div>
    </div>
  );
}
