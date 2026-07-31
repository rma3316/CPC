import { useState, useEffect } from 'react';

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

export default function SettingsModal({ isOpen, onClose, keys, updateKey, volume, setVolume, fontTheme, setFontTheme }) {
  const [editingAction, setEditingAction] = useState(null);
  const [showKeySettings, setShowKeySettings] = useState(false);

  const handleClose = () => {
    setEditingAction(null);
    setShowKeySettings(false);
    onClose();
  };

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
    <div className="fixed inset-0 bg-sky-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300" onClick={handleClose}>
      <div className="glass-panel w-full max-w-md p-8 flex flex-col shadow-2xl relative animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-sky-500 hover:text-sky-700 hover:bg-sky-100/50 transition-colors" onClick={handleClose}>
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
        
        <h2 className="font-headline text-2xl font-bold text-sky-950 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-sky-500">settings</span>
          설정
        </h2>
        
        <div className="w-full flex flex-col gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {!showKeySettings ? (
            <>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-headline font-semibold text-sky-900">효과음 볼륨</span>
                  <span className="text-sky-700 font-bold bg-sky-100/80 px-2.5 py-0.5 rounded text-sm shadow-sm">{volume}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  className="w-full h-2 bg-sky-200/70 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition-all" 
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                />
              </div>

              <div className="flex flex-col gap-3">
                <span className="font-headline font-semibold text-sky-900">폰트 테마</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'modern', label: '모던 (Pretendard)', fontClass: 'font-sans' },
                    { id: 'retro', label: '레트로 (마루미냐)', fontClass: 'font-sans' },
                    { id: 'casual', label: '캐주얼 (배민주아)', fontClass: 'font-sans' },
                    { id: 'tech', label: '디지털 (Share Tech)', fontClass: 'font-sans' }
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                        fontTheme === theme.id 
                          ? 'bg-sky-500 text-white border-sky-600 shadow-md transform scale-[1.02]' 
                          : 'bg-white/40 text-sky-800 border-sky-200 hover:bg-sky-50'
                      } ${theme.fontClass}`}
                      onClick={() => setFontTheme(theme.id)}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-white/40 p-4 rounded-xl border border-sky-100 shadow-sm hover:shadow-md transition-shadow">
                <span className="font-headline font-semibold text-sky-900">조작키 설정</span>
                <button 
                  className="glass-button !w-auto px-5 py-2 text-sm"
                  onClick={() => setShowKeySettings(true)}
                >
                  변경하기
                </button>
              </div>
            </>
          ) : (
            <div className="animate-fade-in flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline font-bold text-sky-900">조작키 매핑</h3>
                <button 
                  className="text-xs text-sky-600 hover:text-sky-800 font-medium flex items-center gap-1 bg-sky-100/50 px-2 py-1 rounded transition-colors"
                  onClick={() => { setShowKeySettings(false); setEditingAction(null); }}
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  뒤로
                </button>
              </div>
              
              <div className="flex flex-col gap-2.5">
                {Object.entries(KEY_LABELS).map(([action, label]) => (
                  <div className="flex items-center justify-between bg-white/40 p-3 px-4 rounded-xl border border-sky-100 shadow-sm" key={action}>
                    <span className="text-sm font-medium text-sky-900">{label}</span>
                    <button 
                      className={`glass-button !w-32 !h-9 text-xs flex justify-center items-center font-bold tracking-wide transition-all ${
                        editingAction === action ? 'ring-2 ring-sky-500 ring-offset-2 bg-sky-50 scale-[1.02]' : ''
                      }`}
                      onClick={() => setEditingAction(action)}
                    >
                      {editingAction === action ? '입력 대기중...' : (keys?.[action] === ' ' ? 'SPACE' : keys?.[action]?.toUpperCase())}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
