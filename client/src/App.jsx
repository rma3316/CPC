// ============================================================
//  App.jsx - 메인 앱 (Lobby → WaitingRoom → Game 화면 전환)
//  담당: 전체 통합
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { useTetris } from './hooks/useTetris';
import { useSettings } from './hooks/useSettings';
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

  const handleKicked = useCallback(() => {
    alert("방장에 의해 추방되었습니다.");
    setScreen('lobby');
    setChatMessages([]);
  }, []);

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
    transferHost,
    kickPlayer,
    leaveRoom,
  } = useSocket({ onKickedCallback: handleKicked });

  const { keys, updateKey, volume, setVolume } = useSettings();

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
    keys,
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
    };

    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event, handler);
    }

    return () => {
      for (const event of Object.keys(handlers)) {
        socket.off(event);
      }
    };
  }, [socket, tetrisStartGame, receiveGarbage]);

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

  const handleLeaveRoom = useCallback(async () => {
    await leaveRoom();
    setScreen('lobby');
    setChatMessages([]);
  }, [leaveRoom]);

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
        keys={keys}
        updateKey={updateKey}
        volume={volume}
        setVolume={setVolume}
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
        onTransferHost={transferHost}
        onKickPlayer={kickPlayer}
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
    </div>
  );
}
