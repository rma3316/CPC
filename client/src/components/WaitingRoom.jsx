// ============================================================
//  WaitingRoom.jsx - 대기실 (Ready 토글, 게임 시작)
//  담당: 개발자 C (UI 컴포넌트 담당)
// ============================================================

import Chat from './Chat';
import './WaitingRoom.css';

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
    <div className="waiting-room-container">
      <div className="cyber-bg" />
      <div className="waiting-room-content">
        <div className="waiting-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="title-glow waiting-title">테트릭</h1>
          <button className="btn-neon small cancel-btn" onClick={onLeaveRoom}>
            ← 로비로 돌아가기
          </button>
        </div>
        <h2 className="room-title-name">{room?.name || 'Room'}</h2>

        <div className="waiting-panels">
          {/* 플레이어 목록 */}
          <div className="glass-card waiting-panel players-panel">
            <h3 className="panel-title">플레이어</h3>
            <ul className="player-list">
              {room?.players?.map((player, i) => (
                <li key={player.id} className="player-item">
                  <span className="player-number">{i + 1}</span>
                  <span className={`player-name-tag ${player.id === myId ? 'me' : ''}`}>
                    {room?.hostId === player.id && <span className="host-badge">👑 </span>}
                    {player.nickname}
                    {player.id === myId && <span className="me-badge">나</span>}
                  </span>
                  <span className={`ready-badge ${player.ready ? 'ready' : ''}`}>
                    {player.ready ? '✔ READY' : '대기 중'}
                  </span>
                  {isHost && player.id !== myId && (
                    <div className="host-controls" style={{ marginLeft: '10px', display: 'flex', gap: '5px' }}>
                      <button className="btn-neon small" onClick={() => onTransferHost(player.id)}>위임</button>
                      <button className="btn-neon small red" onClick={() => onKickPlayer(player.id)}>추방</button>
                    </div>
                  )}
                </li>
              ))}
              {/* 빈 슬롯 */}
              {Array.from({ length: (room?.maxPlayers || 4) - (room?.players?.length || 0) }).map((_, i) => (
                <li key={`empty-${i}`} className="player-item empty">
                  <span className="player-number">{(room?.players?.length || 0) + i + 1}</span>
                  <span className="player-name-tag empty-slot">빈 자리</span>
                </li>
              ))}
            </ul>

            <div className="waiting-actions">
              <button
                id="ready-btn"
                className={`btn-neon ${isReady ? 'green' : ''}`}
                onClick={onToggleReady}
              >
                {isReady ? '✔ 준비 완료' : '준비'}
              </button>
              {isHost && allReady && (
                <button
                  id="start-game-btn"
                  className="btn-neon purple"
                  onClick={onStartGame}
                >
                  🎮 게임 시작
                </button>
              )}
            </div>
          </div>

          {/* 채팅 */}
          <div className="waiting-panel chat-panel-wrapper">
            <Chat 
              messages={chatMessages} 
              onSendMessage={onSendChat} 
              myId={myId} 
              onClearChat={onClearChat}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
