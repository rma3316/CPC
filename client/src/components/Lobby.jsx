// ============================================================
//  Lobby.jsx - 로비 화면 (닉네임 입력, 방 생성/입장)
//  담당: 개발자 C (UI 컴포넌트 담당)
// ============================================================

import { useState } from 'react';
import SettingsModal from './SettingsModal';
import './Lobby.css';

/**
 * @param {object} props
 * @param {string} props.nickname
 * @param {Function} props.onSetNickname
 * @param {Array} props.rooms
 * @param {Function} props.onCreateRoom
 * @param {Function} props.onJoinRoom
 * @param {boolean} props.isConnected
 */
export default function Lobby({
  nickname,
  onSetNickname,
  rooms,
  onCreateRoom,
  onJoinRoom,
  isConnected,
}) {
  const [nicknameInput, setNicknameInput] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isNicknameSet, setIsNicknameSet] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleSetNickname = (e) => {
    e.preventDefault();
    if (nicknameInput.trim()) {
      onSetNickname(nicknameInput.trim());
      setIsNicknameSet(true);
    }
  };

  const handleCreateRoom = () => {
    if (roomName.trim()) {
      onCreateRoom(roomName.trim());
      setRoomName('');
    }
  };

  // 닉네임 입력 단계
  if (!isNicknameSet) {
    return (
      <div className="lobby-container">
        <div className="cyber-bg" />
        <div className="lobby-content">
          <h1 className="title-glow lobby-title">TETRIS</h1>
          <p className="lobby-subtitle">ONLINE BATTLE</p>

          <form className="nickname-form glass-card" onSubmit={handleSetNickname}>
            <label className="form-label">닉네임을 입력하세요</label>
            <input
              id="nickname-input"
              className="input-neon"
              type="text"
              placeholder="Player Name..."
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              maxLength={16}
              autoFocus
            />
            <button
              id="nickname-submit"
              className="btn-neon"
              type="submit"
              disabled={!nicknameInput.trim()}
            >
              입장하기
            </button>

            <div className={`connection-status ${isConnected ? 'connected' : ''}`}>
              <span className="status-dot" />
              {isConnected ? '서버 연결됨' : '서버 연결 중...'}
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 방 목록 단계
  return (
    <div className="lobby-container">
      <div className="cyber-bg" />
      <div className="lobby-content">
        <h1 className="title-glow lobby-title">TETRIS</h1>
        <p className="lobby-subtitle">LOBBY</p>

        <div className="lobby-panels">
          {/* 방 생성 */}
          <div className="glass-card lobby-panel create-panel">
            <h2 className="panel-title">방 만들기</h2>
            <input
              id="room-name-input"
              className="input-neon"
              type="text"
              placeholder="방 이름..."
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={20}
            />
            <button
              id="create-room-btn"
              className="btn-neon green"
              onClick={handleCreateRoom}
              disabled={!roomName.trim()}
            >
              + 새 방 만들기
            </button>
          </div>

          {/* 방 목록 */}
          <div className="glass-card lobby-panel room-list-panel">
            <h2 className="panel-title">방 목록</h2>
            {rooms.length === 0 ? (
              <p className="empty-rooms">아직 방이 없습니다. 방을 만들어보세요!</p>
            ) : (
              <ul className="room-list">
                {rooms.map((room) => (
                  <li key={room.id} className="room-item glass-card-sm">
                    <div className="room-info">
                      <span className="room-name">{room.name}</span>
                      <span className="room-players">
                        {room.playerCount}/{room.maxPlayers} 명
                      </span>
                      <span className={`room-status status-${room.status}`}>
                        {room.status === 'waiting' ? '대기 중' :
                         room.status === 'playing' ? '게임 중' : '종료'}
                      </span>
                    </div>
                    <button
                      className="btn-neon purple"
                      onClick={() => onJoinRoom(room.id)}
                      disabled={room.status !== 'waiting' || room.playerCount >= room.maxPlayers}
                    >
                      참가
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lobby-footer">
          <span className="player-name">🎮 {nickname}</span>
          <div className="footer-right">
            <span className={`connection-status ${isConnected ? 'connected' : ''}`}>
              <span className="status-dot" />
              {isConnected ? '연결됨' : '연결 중...'}
            </span>
            <button 
              className="btn-neon small settings-btn" 
              onClick={() => setIsSettingsOpen(true)}
            >
              ⚙ 설정
            </button>
          </div>
        </div>

        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      </div>
    </div>
  );
}
