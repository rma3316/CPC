import React, { useState } from 'react';

export default function ModeSelection({ onSelectMode }) {
  const [step, setStep] = useState(1);
  const [playType, setPlayType] = useState(null); // 'single' | 'multi'

  const handleSelectPlayType = (type) => {
    setPlayType(type);
    setStep(2);
  };

  const handleSelectSubMode = (mode) => {
    onSelectMode({ playType, mode });
  };

  return (
    <div className="bg-atmosphere text-sky-950 font-body min-h-screen flex flex-col items-center justify-center relative overflow-hidden w-full animate-fade-in" style={{ margin: 0, padding: 0 }}>
      {/* Ambient background shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-200/50 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-sky-300/40 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
      
      <main className="w-full max-w-4xl px-6 flex flex-col items-center justify-center z-10 relative">
        <header className="mb-12 text-center relative w-full flex flex-col items-center">
          {step === 2 && (
            <button 
              className="absolute left-0 top-1/2 -translate-y-1/2 glass-button !w-auto px-4 py-2 flex items-center gap-2"
              onClick={() => setStep(1)}
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              뒤로
            </button>
          )}
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-sky-950 tracking-tight mb-4 drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)]">
            {step === 1 ? '플레이 방식 선택' : (playType === 'single' ? '싱글플레이 모드' : '멀티플레이 모드')}
          </h1>
          <p className="font-body text-lg text-sky-800 font-medium">
            {step === 1 ? '혼자 할지, 함께 할지 선택하세요' : '원하는 세부 규칙을 선택하세요'}
          </p>
        </header>
        
        {step === 1 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
            {/* Single Player */}
            <button 
              className="glass-panel group relative overflow-hidden rounded-3xl p-10 flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-2 hover:bg-white/60 shadow-lg"
              onClick={() => handleSelectPlayType('single')}
            >
              <div className="w-20 h-20 rounded-2xl bg-sky-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                <span className="material-symbols-outlined text-5xl text-sky-600" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              </div>
              <h2 className="font-headline text-3xl font-bold text-sky-950 mb-3">싱글플레이</h2>
              <p className="font-body text-sky-800 text-center opacity-80">혼자서 기록을 갱신하거나<br/>여유롭게 연습하세요</p>
            </button>
            
            {/* Multiplayer */}
            <button 
              className="glass-panel group relative overflow-hidden rounded-3xl p-10 flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-2 hover:bg-white/60 shadow-lg"
              onClick={() => handleSelectPlayType('multi')}
            >
              <div className="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                <span className="material-symbols-outlined text-5xl text-indigo-600" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
              </div>
              <h2 className="font-headline text-3xl font-bold text-sky-950 mb-3">멀티플레이</h2>
              <p className="font-body text-sky-800 text-center opacity-80">다른 플레이어들과<br/>실시간으로 대결하세요</p>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl animate-fade-in">
            {playType === 'single' ? (
              <>
                <ModeCard 
                  icon="timer" title="스프린트" desc="40줄 삭제 최단 시간 기록" 
                  onClick={() => handleSelectSubMode('sprint')} 
                />
                <ModeCard 
                  icon="all_inclusive" title="마라톤" desc="끝없는 생존과 점수 갱신" 
                  onClick={() => handleSelectSubMode('marathon')} 
                />
                <ModeCard 
                  icon="school" title="프랙티스" desc="게임오버 없는 자유 연습" 
                  onClick={() => handleSelectSubMode('practice')} 
                />
              </>
            ) : (
              <>
                <ModeCard 
                  icon="swords" title="VS 대전" desc="서로 공격하는 기본 멀티전" 
                  isMaterial={false}
                  onClick={() => handleSelectSubMode('vs')} 
                />
                <ModeCard 
                  icon="rocket_launch" title="40줄 스피드전" desc="공격 없이 누구보다 빠르게" 
                  onClick={() => handleSelectSubMode('sprint')} 
                />
                <ModeCard 
                  icon="coffee" title="멀티 프랙티스" desc="공격 없는 다인 관전/연습" 
                  onClick={() => handleSelectSubMode('practice')} 
                />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ModeCard({ icon, title, desc, onClick, isMaterial = true }) {
  return (
    <button 
      className="glass-panel group relative overflow-hidden rounded-2xl p-8 flex flex-col items-center justify-center aspect-square transition-all duration-300 hover:-translate-y-2 hover:bg-white/70 shadow-md hover:shadow-xl active:scale-95"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      
      {isMaterial ? (
        <span className="material-symbols-outlined text-6xl text-sky-600 mb-6 group-hover:scale-110 transition-transform duration-300" style={{ fontVariationSettings: "'FILL' 1" }}>
          {icon}
        </span>
      ) : (
        <span className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
          ⚔️
        </span>
      )}
      
      <h2 className="font-headline text-2xl font-bold text-sky-950 mb-2">{title}</h2>
      <p className="font-body text-sm text-sky-800 text-center opacity-80 group-hover:opacity-100 transition-opacity whitespace-pre-line">{desc}</p>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-400/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </button>
  );
}
