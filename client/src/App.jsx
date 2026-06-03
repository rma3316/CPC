// ============================================================
//  App.jsx - 메인 앱 (Lobby → WaitingRoom → Game 화면 전환)
//  담당: 전체 통합
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { useTetris } from './hooks/useTetris';
import Lobby from './components/Lobby';
import WaitingRoom from './components/WaitingRoom';
import GameBoard from './components/GameBoard';
import MiniBoard from './components/MiniBoard';
import ScorePanel from './components/ScorePanel';
import Chat from './components/Chat';
import './App.css';

/**
 * 앱 상태 흐름:
 *   'lobby' → 'waiting' → 'playing' → 'result' → 'waiting'
 */
export default function App() {
  const [screen, setScreen] = useState('lobby'); // lobby | waiting | playing | result
  const [chatMessages, setChatMessages] = useState([]);
  const [opponents, setOpponents] = useState({});
  const [allReady, setAllReady] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [showResumeConfirm, setShowResumeConfirm] = useState(false);
  const [hasVotedResume, setHasVotedResume] = useState(false);

  const {
    socket,
    isConnected,
    rooms,
    currentRoom,
    nickname,
    setNickname,
    createRoom,
    joinRoom,
    toggleReady,
    startGame: socketStartGame,
    sendPlayerState,
    sendLineCleared,
    sendGameOver,
    sendChatMessage,
    sendPauseGame,
    sendResumeRequest,
    sendResumeAgreed,
  } = useSocket();

  // --- 테트리스 게임 훅 ---
  const {
    board,
    score,
    level,
    totalLines,
    currentPiece,
    holdPiece,
    nextPieces,
    isGameOver,
    isPlaying,
    combo,
    ghostY,
    startGame: tetrisStartGame,
    receiveGarbage,
    // [A 협업] A 담당자가 구현해야 할 인터페이스
    isPaused,
    pauseGame,
    resumeGame,
  } = useTetris({
    onLineCleared: sendLineCleared,
    onGameOver: sendGameOver,
    onStateUpdate: sendPlayerState,
  });

  // --- 소켓 이벤트 리스너 ---
  useEffect(() => {
    if (!socket) return;

    const handlers = {
      chat_message: (msg) => {
        setChatMessages(prev => [...prev.slice(-100), msg]);
      },

      all_ready: () => setAllReady(true),

      room_updated: (room) => {
        // allReady 재계산
        if (room.players.length >= 2 && room.players.every(p => p.ready)) {
          setAllReady(true);
        } else {
          setAllReady(false);
        }
      },

      game_started: () => {
        setScreen('playing');
        setChatMessages([]);
        setOpponents({});
        tetrisStartGame();
      },

      opponent_state: ({ playerId, board: opBoard }) => {
        setOpponents(prev => ({
          ...prev,
          [playerId]: { ...(prev[playerId] || {}), board: opBoard },
        }));
      },

      receive_garbage: ({ lines }) => {
        receiveGarbage(lines);
      },

      player_eliminated: ({ playerId }) => {
        setOpponents(prev => ({
          ...prev,
          [playerId]: { ...(prev[playerId] || {}), alive: false },
        }));
      },

      game_finished: ({ winner }) => {
        setGameResult(winner);
        setScreen('result');
      },

      game_paused: () => {
        pauseGame();
        setHasVotedResume(false);
      },

      resume_prompt: () => {
        setShowResumeConfirm(true);
        setHasVotedResume(false);
      },

      game_resumed: () => {
        setShowResumeConfirm(false);
        setHasVotedResume(false);
        resumeGame();
      },
    };

    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event, handler);
    }

    return () => {
      for (const event of Object.keys(handlers)) {
        socket.off(event);
      }
    };
  }, [socket, tetrisStartGame, receiveGarbage, pauseGame, resumeGame]);

  // --- 글로벌 윈도우 포커스/블러 이벤트 감지 (게임 화면일 때만 동작) ---
  useEffect(() => {
    if (screen !== 'playing') return;

    const handleBlur = () => {
      sendPauseGame();
    };

    const handleFocus = () => {
      sendResumeRequest();
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [screen, sendPauseGame, sendResumeRequest]);

  // --- 핸들러 ---
  const handleCreateRoom = useCallback(async (roomName) => {
    const result = await createRoom(roomName);
    if (result.success) {
      setScreen('waiting');
      setChatMessages([]);
    }
  }, [createRoom]);

  const handleJoinRoom = useCallback(async (roomId) => {
    const result = await joinRoom(roomId);
    if (result.success) {
      setScreen('waiting');
      setChatMessages([]);
    }
  }, [joinRoom]);

  const handleStartGame = useCallback(() => {
    socketStartGame();
  }, [socketStartGame]);

  const handleBackToWaiting = useCallback(() => {
    setScreen('waiting');
    setGameResult(null);
  }, []);

  const handleLeaveRoom = useCallback(() => {
    // [B 협업] B 담당자가 useSocket.js에 leaveRoom(또는 socket.emit('leave_room'))을 구현하면 여기서 호출
    setScreen('lobby');
    setChatMessages([]);
  }, []);

  // --- 화면 렌더링 ---
  if (screen === 'lobby') {
    return (
      <Lobby
        nickname={nickname}
        onSetNickname={setNickname}
        rooms={rooms}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        isConnected={isConnected}
      />
    );
  }

  if (screen === 'waiting') {
    return (
      <WaitingRoom
        room={currentRoom}
        myId={socket?.id}
        allReady={allReady}
        onToggleReady={toggleReady}
        onStartGame={handleStartGame}
        chatMessages={chatMessages}
        onSendChat={sendChatMessage}
        onLeaveRoom={handleLeaveRoom}
        onClearChat={() => setChatMessages([])}
      />
    );
  }

  if (screen === 'result') {
    return (
      <div className="result-container">
        <div className="cyber-bg" />
        <div className="result-content glass-card">
          <h1 className="title-glow result-title">GAME OVER</h1>
          {gameResult && (
            <div className="winner-info">
              <span className="winner-label">🏆 승자</span>
              <span className="winner-name">{gameResult.nickname}</span>
            </div>
          )}
          <div className="result-stats">
            <div className="result-stat">
              <span className="stat-label">MY SCORE</span>
              <span className="stat-value">{score.toLocaleString()}</span>
            </div>
            <div className="result-stat">
              <span className="stat-label">LINES</span>
              <span className="stat-value">{totalLines}</span>
            </div>
            <div className="result-stat">
              <span className="stat-label">LEVEL</span>
              <span className="stat-value">{level}</span>
            </div>
          </div>
          <button className="btn-neon purple" onClick={handleBackToWaiting}>
            대기실로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // --- 게임 화면 (screen === 'playing') ---
  const opponentEntries = currentRoom?.players
    ?.filter(p => p.id !== socket?.id)
    ?.map(p => ({
      ...p,
      board: opponents[p.id]?.board || null,
      alive: opponents[p.id]?.alive !== false,
    })) || [];

  return (
    <div className="game-container">
      <div className="cyber-bg" />

      {/* 왼쪽: 점수 패널 */}
      <div className="game-left">
        <ScorePanel
          score={score}
          level={level}
          totalLines={totalLines}
          combo={combo}
          holdPiece={holdPiece}
          nextPieces={nextPieces}
        />
      </div>

      {/* 중앙: 메인 보드 */}
      <div className="game-center">
        <GameBoard 
          board={board} 
          currentPiece={currentPiece} 
          ghostY={ghostY} 
          isPaused={isPaused}
          onPauseGame={pauseGame}
          onResumeGame={resumeGame}
        />
        {isGameOver && (
          <div className="game-over-overlay">
            <span className="game-over-text">GAME OVER</span>
          </div>
        )}
      </div>

      {/* 오른쪽: 상대방 미니 보드 + 채팅 */}
      <div className="game-right">
        <div className="opponents-grid">
          {opponentEntries.map(op => (
            <MiniBoard
              key={op.id}
              board={op.board}
              nickname={op.nickname}
              alive={op.alive}
            />
          ))}
        </div>
        <Chat 
          messages={chatMessages} 
          onSendMessage={sendChatMessage} 
          myId={socket?.id} 
          onClearChat={() => setChatMessages([])}
        />
      </div>

      {/* 재개 확인 팝업 (오버레이) */}
      {showResumeConfirm && (
        <div className="result-container" style={{ zIndex: 1000, background: 'rgba(0, 0, 0, 0.8)' }}>
          <div className="result-content glass-card" style={{ padding: '40px' }}>
            <h2 className="title-glow" style={{ fontSize: '2rem', marginBottom: '20px' }}>RESUME GAME?</h2>
            {hasVotedResume ? (
              <p style={{ color: '#aaa', fontSize: '1.2rem', marginBottom: '30px' }}>
                다른 플레이어의 확인을 기다리는 중...
              </p>
            ) : (
              <p style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '30px' }}>
                플레이어가 돌아왔습니다. 게임을 재개하시겠습니까?
              </p>
            )}
            <button 
              className="btn-neon purple" 
              onClick={() => {
                if (!hasVotedResume) {
                  sendResumeAgreed();
                  setHasVotedResume(true);
                }
              }}
              disabled={hasVotedResume}
              style={{ opacity: hasVotedResume ? 0.5 : 1, cursor: hasVotedResume ? 'not-allowed' : 'pointer' }}
            >
              {hasVotedResume ? '대기 중' : '확인 (Resume)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
