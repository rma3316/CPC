import React from 'react';

export default function ModeSelection({ onSelectMode }) {
  return (
    <div className="bg-atmosphere text-sky-950 font-body min-h-screen flex flex-col items-center justify-center relative overflow-hidden w-full" style={{ margin: 0, padding: 0 }}>
      {/* Ambient background shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-200/50 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-sky-300/40 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
      
      {/* Main Content Canvas */}
      <main className="w-full max-w-4xl px-6 flex flex-col items-center justify-center z-10 relative">
        <header className="mb-16 text-center">
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-sky-950 tracking-tight mb-4 drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)]">
            모드 선택
          </h1>
          <p className="font-body text-lg text-sky-800 font-medium">
            플레이할 게임 모드를 선택하세요
          </p>
        </header>
        
        {/* Bento Grid for Modes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {/* Classic Mode */}
          <button 
            className="glass-panel glow-effect glow-hover group relative overflow-hidden rounded-2xl p-8 flex flex-col items-center justify-center aspect-square transition-all duration-300 hover:-translate-y-2 hover:bg-white/70"
            onClick={() => onSelectMode('classic')}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-sky-100/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <span className="material-symbols-outlined text-6xl text-sky-600 mb-6 group-hover:scale-110 transition-transform duration-300" style={{ fontVariationSettings: "'FILL' 1" }}>
              videogame_asset
            </span>
            <h2 className="font-headline text-2xl font-semibold text-sky-950 mb-2">클래식</h2>
            <p className="font-body text-sm text-sky-800 text-center opacity-80 group-hover:opacity-100 transition-opacity">끝없는 도전,<br/>전통적인 테트릭 경험</p>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-400/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
          
          {/* Sprint Mode */}
          <button 
            className="glass-panel glow-effect glow-hover group relative overflow-hidden rounded-2xl p-8 flex flex-col items-center justify-center aspect-square transition-all duration-300 hover:-translate-y-2 hover:bg-white/70"
            onClick={() => onSelectMode('sprint')}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-sky-100/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <span className="material-symbols-outlined text-6xl text-sky-600 mb-6 group-hover:scale-110 transition-transform duration-300" style={{ fontVariationSettings: "'FILL' 1" }}>
              timer
            </span>
            <h2 className="font-headline text-2xl font-semibold text-sky-950 mb-2">스프린트</h2>
            <p className="font-body text-sm text-sky-800 text-center opacity-80 group-hover:opacity-100 transition-opacity">40줄 삭제,<br/>최단 시간 기록 경쟁</p>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-400/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
          
          {/* Marathon Mode */}
          <button 
            className="glass-panel glow-effect glow-hover group relative overflow-hidden rounded-2xl p-8 flex flex-col items-center justify-center aspect-square transition-all duration-300 hover:-translate-y-2 hover:bg-white/70"
            onClick={() => onSelectMode('marathon')}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-sky-100/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <span className="material-symbols-outlined text-6xl text-sky-600 mb-6 group-hover:scale-110 transition-transform duration-300" style={{ fontVariationSettings: "'FILL' 1" }}>
              incognito
            </span>
            <h2 className="font-headline text-2xl font-semibold text-sky-950 mb-2">마라톤</h2>
            <p className="font-body text-sm text-sky-800 text-center opacity-80 group-hover:opacity-100 transition-opacity">레벨 15 도달,<br/>점진적인 난이도 상승</p>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-400/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
      </main>
    </div>
  );
}
