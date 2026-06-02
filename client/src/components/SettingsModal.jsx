import React from 'react';
import './SettingsModal.css';

export default function SettingsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="title-glow">설정 (Settings)</h2>
        
        <div className="settings-options">
          {/* A 담당자가 키 매핑 데이터를 붙일 수 있도록 껍데기만 생성 */}
          <div className="setting-item">
            <span>조작키 설정</span>
            <button className="btn-neon small">변경</button>
          </div>
          
          <div className="setting-item">
            <span>효과음 볼륨</span>
            <input type="range" min="0" max="100" className="range-neon" />
          </div>
        </div>

        <button className="btn-neon purple" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
