import Chat from './Chat';

const MODE_LABELS = {
  vs: 'VS 대전',
  sprint: '40줄 스피드전',
  practice: '멀티 프랙티스',
};

/**
 * @param {object} props
 * @param {object} props.room - 현재 방 정보
 * @param {string} props.myId - 내 소켓 ID
 * @param {boolean} props.allReady - 전원 Ready 여부
 * @param {Function} props.onToggleReady
 * @param {Function} props.onStartGame
 * @param {Array} props.chatMessages
 * @param {Function} props.onSendChat
 */
export default function WaitingRoom({
  room,
  myId,
  allReady,
  onToggleReady,
  onStartGame,
  chatMessages,
  onSendChat,
  onLeaveRoom,
  onClearChat,
  onTransferHost,
  onKickPlayer,
}) {
  const myPlayer = room?.players?.find(p => p.id === myId);
  const isReady = myPlayer?.ready || false;
  const isHost = room?.hostId === myId;

  return (
    <div className="bg-atmosphere min-h-screen w-full flex flex-col items-center justify-center relative font-body text-sky-950 overflow-hidden" style={{ margin: 0, padding: 0 }}>
      {/* Ambient background shapes */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-200/50 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-sky-300/40 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

      <main className="w-full max-w-5xl px-6 py-8 flex flex-col z-10 relative">
        <header className="mb-8 w-full flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-left flex flex-col">
            <h1 className="font-headline text-4xl font-bold text-sky-950 tracking-tight drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)]">
              테트릭
            </h1>
            <h2 className="font-body text-lg text-sky-800 font-semibold mt-1">
              방: <span className="text-sky-600">{room?.name || 'Room'}</span>
              <span className="ml-2 inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700 align-middle">
                {MODE_LABELS[room?.mode] || room?.mode || 'VS 대전'}
              </span>
            </h2>
          </div>
          <button 
            className="glass-button !w-auto px-4 py-2 text-sm flex items-center gap-2 rounded-lg"
            onClick={onLeaveRoom}
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            로비로 돌아가기
          </button>
        </header>

        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 플레이어 목록 */}
          <div className="glass-panel rounded-2xl p-6 lg:col-span-2 flex flex-col min-h-[400px]">
            <h3 className="font-headline text-xl font-bold text-sky-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sky-500" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
              플레이어
            </h3>
            
            <ul className="flex-1 space-y-3">
              {room?.players?.map((player, i) => (
                <li key={player.id} className="group flex items-center justify-between bg-white/40 border border-sky-100/50 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </span>
                    <span className={`font-headline text-lg font-semibold ${player.id === myId ? 'text-sky-600' : 'text-sky-900'} flex items-center gap-2`}>
                      {room?.hostId === player.id && <span title="방장">👑</span>}
                      {player.nickname}
                      {player.id === myId && <span className="bg-sky-200 text-sky-800 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">나</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${player.ready ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-slate-100/80 text-slate-500 border border-slate-200'}`}>
                      {player.ready ? '✔ READY' : '대기 중'}
                    </span>
                    {isHost && player.id !== myId && (
                      <div className="flex gap-2">
                        <button className="glass-button !w-auto !h-auto px-3 py-1.5 text-xs" onClick={() => onTransferHost(player.id)}>위임</button>
                        <button className="glass-button !w-auto !h-auto px-3 py-1.5 text-xs !text-red-500 hover:!bg-red-50" onClick={() => onKickPlayer(player.id)}>추방</button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
              {/* 빈 슬롯 */}
              {Array.from({ length: (room?.maxPlayers || 4) - (room?.players?.length || 0) }).map((_, i) => (
                <li key={`empty-${i}`} className="flex items-center gap-4 bg-slate-50/40 border border-slate-100/50 rounded-xl p-3 opacity-60">
                  <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center font-bold text-sm">
                    {(room?.players?.length || 0) + i + 1}
                  </span>
                  <span className="font-headline text-lg font-medium text-slate-400">빈 자리</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-5 border-t border-sky-100/80 flex justify-end gap-3">
              {!isHost && (
                <button
                  className={`glass-button !w-auto px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${isReady ? 'ring-2 ring-emerald-400 bg-emerald-50 text-emerald-700' : ''}`}
                  onClick={onToggleReady}
                >
                  {isReady ? <><span className="material-symbols-outlined text-lg">check_circle</span>준비 완료</> : '준비하기'}
                </button>
              )}
              {isHost && (
                <button
                  className={`glass-button !w-auto px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 border-none shadow-lg transition-all ${allReady ? '!bg-sky-500 !text-white hover:!bg-sky-600 shadow-sky-500/30 hover:scale-105' : '!bg-slate-300 !text-slate-500 shadow-none cursor-not-allowed opacity-70'}`}
                  onClick={allReady ? onStartGame : undefined}
                  disabled={!allReady}
                >
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                  게임 시작
                </button>
              )}
            </div>
          </div>

          {/* 채팅 */}
          <div className="lg:col-span-1 flex flex-col h-[500px] lg:h-auto">
            <Chat 
              messages={chatMessages} 
              onSendMessage={onSendChat} 
              myId={myId} 
              onClearChat={onClearChat}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
