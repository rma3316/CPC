import React, { useState, useEffect } from 'react';

export default function LoginScreen({ onSetNickname }) {
  const [nicknameInput, setNicknameInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (nicknameInput) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 100);
      return () => clearTimeout(timer);
    }
  }, [nicknameInput]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const modal = document.querySelector('.glass-modal');
      if (!modal) return;
      
      const xAxis = (window.innerWidth / 2 - e.pageX) / 50;
      const yAxis = (window.innerHeight / 2 - e.pageY) / 50;
      
      modal.style.transform = `perspective(1000px) rotateY(${xAxis}deg) rotateX(${yAxis}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const handleMouseLeave = () => {
      const modal = document.querySelector('.glass-modal');
      if (modal) {
        modal.style.transform = `perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)`;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nicknameInput.trim() && !isFadingOut) {
      setIsFadingOut(true);
      setTimeout(() => {
        onSetNickname(nicknameInput.trim());
      }, 300); // fade-out 애니메이션 시간(0.3초) 대기 후 화면 전환
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center relative antialiased selection:bg-sky-500/30 selection:text-sky-700 bg-atmosphere overflow-hidden ${isFadingOut ? 'animate-fade-out' : 'animate-fade-in'}`} style={{ margin: 0, padding: 0 }}>
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="tetrimino tetrimino-i"></div>
        <div className="tetrimino tetrimino-t"></div>
        <div className="tetrimino tetrimino-l"></div>
        <div className="tetrimino tetrimino-o"></div>
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-300/30 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[120px]"></div>
      </div>
      
      {/* Main Content Container */}
      <main className="relative z-10 w-full max-w-md px-6 perspective-1000">
        {/* Modal */}
        <div className="glass-modal rounded-2xl p-8 transform transition-all duration-500 hover:scale-[1.02] relative overflow-hidden group">
          {/* Subtle decorative top highlight */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent"></div>
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/60 border border-sky-300/30 mb-4 shadow-[0_0_30px_rgba(14,165,233,0.15)]">
              <span className="material-symbols-outlined text-3xl text-sky-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                sports_esports
              </span>
            </div>
            <h1 className="font-headline text-3xl font-bold tracking-tight mb-2 glow-text text-sky-950">아이디 입력</h1>
            <p className="font-body text-sm text-slate-600 font-medium">테트릭에 오신 것을 환영합니다</p>
          </div>
          
          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2 relative group/input">
              <label className="block font-label text-xs uppercase tracking-widest text-sky-700/90 font-semibold pl-1" htmlFor="userId">
                User ID
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-slate-500 group-focus-within/input:text-sky-600 transition-colors">
                  person
                </span>
                <input 
                  autoComplete="off" 
                  className={`glass-input w-full h-14 pl-12 pr-4 rounded-xl text-slate-800 placeholder:text-slate-500/70 font-body text-base transition-all duration-100 ${isTyping ? 'scale-[1.03] bg-white/90 shadow-[0_0_20px_rgba(14,165,233,0.3)]' : 'scale-100'}`}
                  id="userId" 
                  placeholder="아이디를 입력하세요" 
                  required 
                  spellCheck="false" 
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  maxLength={16}
                  autoFocus
                />
                {/* Focus glow line */}
                <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-sky-500 scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-300 origin-left"></div>
              </div>
            </div>
            
            <button className="glass-button w-full h-14 rounded-xl font-headline font-bold text-lg tracking-wide flex items-center justify-center gap-2" type="submit" disabled={!nicknameInput.trim()}>
              <span>입력 완료</span>
              <span className="material-symbols-outlined text-lg">
                arrow_forward
              </span>
            </button>
          </form>
          
          {/* Footer / Optional links */}
          <div className="mt-8 text-center">
            <a className="font-body text-xs text-slate-600 hover:text-sky-600 transition-colors" href="#">
              새 계정 만들기
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
