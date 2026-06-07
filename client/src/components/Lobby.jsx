import { useState, useEffect } from 'react';

/**
 * @param {object} props
 * @param {string} props.nickname
 * @param {Array} props.rooms
 * @param {Function} props.onCreateRoom
 * @param {Function} props.onJoinRoom
 * @param {boolean} props.isConnected
 */
export default function Lobby({
  nickname,
  rooms,
  onCreateRoom,
  onJoinRoom,
  isConnected,
  onOpenSettings,
  onGoBack,
}) {
  const [roomName, setRoomName] = useState('');
  const [roomMode, setRoomMode] = useState('vs');

  useEffect(() => {
    const handleMouseMove = (e) => {
      const modal = document.querySelector('.lobby-modal');
      if (!modal) return;
      
      // 로비 화면은 면적이 넓으므로 로그인(/50)보다 더 완만한 각도로 조절(/150)
      const xAxis = (window.innerWidth / 2 - e.pageX) / 150;
      const yAxis = (window.innerHeight / 2 - e.pageY) / 150;
      
      modal.style.transform = `perspective(1000px) rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
    };

    const handleMouseLeave = () => {
      const modal = document.querySelector('.lobby-modal');
      if (modal) {
        modal.style.transform = `perspective(1000px) rotateY(0deg) rotateX(0deg)`;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (roomName.trim()) {
      onCreateRoom(roomName.trim(), roomMode);
      setRoomName('');
    }
  };

  return (
    <div className="bg-atmosphere min-h-screen w-full flex flex-col items-center justify-center relative font-body text-sky-950 overflow-hidden" style={{ margin: 0, padding: 0 }}>
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

      <main className="w-full max-w-5xl px-6 py-8 flex flex-col items-center z-10 relative perspective-1000">
        <div className="lobby-modal w-full transform transition-transform duration-500 will-change-transform">
          <header className="mb-10 text-center w-full flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <h1 className="font-headline text-4xl font-bold text-sky-950 tracking-tight drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)]">
                테트릭 로비
              </h1>
              <p className="font-body text-sm text-sky-800 font-medium mt-1">
                반갑습니다, <span className="font-bold text-sky-600">{nickname}</span>님!
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                {isConnected ? '서버 연결됨' : '연결 중...'}
              </span>
              <button 
                className="glass-button !w-auto px-4 py-2 text-sm flex items-center gap-2 rounded-lg"
                onClick={onOpenSettings}
                style={{ width: 'auto' }}
              >
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
                설정
              </button>
            </div>
          </header>
          
          <div className="flex items-center gap-2 mb-6">
            <button 
              className="text-sm text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1 bg-white/40 hover:bg-white/60 px-3 py-1.5 rounded-lg transition-all border border-sky-100 shadow-sm"
              onClick={onGoBack}
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              모드 선택으로
            </button>
          </div>

          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 방 만들기 패널 */}
            <div className="glass-panel rounded-2xl p-6 lg:col-span-1 h-fit">
              <h2 className="font-headline text-xl font-bold text-sky-900 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-sky-500" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                새 방 만들기
              </h2>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div className="space-y-2 relative group/input">
                  <input
                    className="glass-input w-full h-12 px-4 rounded-xl text-slate-800 placeholder:text-slate-500/70 font-body text-sm"
                    type="text"
                    placeholder="방 이름을 입력하세요"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    maxLength={20}
                  />
                </div>
                <div className="flex bg-white/40 rounded-xl p-1 border border-sky-100 shadow-sm">
                  {[
                    { id: 'vs', label: 'VS 대전', icon: 'swords' },
                    { id: 'sprint', label: '스프린트', icon: 'timer' },
                    { id: 'practice', label: '프랙티스', icon: 'school' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${
                        roomMode === m.id ? 'bg-sky-500 text-white shadow-md scale-100' : 'text-sky-700 hover:bg-sky-100/50 hover:text-sky-900'
                      }`}
                      onClick={() => setRoomMode(m.id)}
                    >
                      {m.id === 'vs' ? <span>⚔️</span> : <span className="material-symbols-outlined text-[18px] mb-0.5">{m.icon}</span>}
                      {m.label}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  className="glass-button w-full h-12 rounded-xl font-headline font-bold text-sm tracking-wide flex items-center justify-center gap-2"
                  disabled={!roomName.trim()}
                >
                  <span>방 만들기</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </form>
            </div>

            {/* 방 목록 패널 */}
            <div className="glass-panel rounded-2xl p-6 lg:col-span-2 min-h-[400px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-headline text-xl font-bold text-sky-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sky-500" style={{ fontVariationSettings: "'FILL' 1" }}>format_list_bulleted</span>
                  참가 가능한 방
                </h2>
                <span className="text-sm font-medium text-sky-700 bg-sky-100/50 px-3 py-1 rounded-full">
                  총 {rooms.length}개
                </span>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {rooms.length === 0 ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-sky-800/60 mt-10">
                    <span className="material-symbols-outlined text-5xl mb-3 opacity-50">search_off</span>
                    <p>현재 생성된 방이 없습니다.</p>
                    <p className="text-sm">직접 새로운 방을 만들어보세요!</p>
                  </div>
                ) : (
                  rooms.map((room) => (
                    <div key={room.id} className="group relative overflow-hidden rounded-xl p-4 flex flex-col gap-2 transition-all duration-300 hover:bg-white/40 border border-sky-100/20 hover:border-sky-300/30 shadow-sm hover:shadow-md bg-white/20 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-headline font-bold text-lg text-sky-950 truncate max-w-[60%]">{room.name}</span>
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold tracking-wider bg-indigo-100 text-indigo-700 whitespace-nowrap">
                          {room.mode === 'vs' ? 'VS 대전' : room.mode === 'sprint' ? '스프린트' : '프랙티스'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-3 text-xs font-medium text-sky-700">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">group</span>
                            {room.playerCount}/{room.maxPlayers} 명
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                            room.status === 'waiting' ? 'bg-sky-100 text-sky-700' :
                            room.status === 'playing' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {room.status === 'waiting' ? '대기 중' : room.status === 'playing' ? '게임 중' : '종료'}
                          </span>
                        </div>
                        <button
                          className="glass-button !w-auto px-6 py-1.5 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          onClick={() => onJoinRoom(room.id)}
                          disabled={room.status !== 'waiting' || room.playerCount >= room.maxPlayers}
                          style={{ width: 'auto' }}
                        >
                          참가하기
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

