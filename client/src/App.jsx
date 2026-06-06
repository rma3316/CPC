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
import LoginScreen from './components/LoginScreen';
import ModeSelection from './components/ModeSelection';
import './App.css';

/**
 * 앱 상태 흐름:
 *   'lobby' → 'waiting' → 'playing' → 'result' → 'waiting'
 */
export default function App() {
  const [screen, setScreen] = useState('login'); // login | mode | lobby | waiting | playing | result
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

  const handleSetNickname = (name) => {
    setNickname(name);
    setScreen('mode');
  };

  const handleSelectMode = (mode) => {
    // mode: 'classic', 'sprint', 'marathon'
    setScreen('lobby');
  };

  // --- 화면 렌더링 ---
  if (screen === 'login') {
    return <LoginScreen onSetNickname={handleSetNickname} />;
  }

  if (screen === 'mode') {
    return <ModeSelection onSelectMode={handleSelectMode} />;
  }

  if (screen === 'lobby') {
    return (
      <Lobby
        nickname={nickname}
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
      <div className="bg-atmosphere min-h-screen w-full flex flex-col items-center justify-center relative font-body text-sky-950 overflow-hidden" style={{ margin: 0, padding: 0 }}>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-200/50 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-sky-300/40 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

        <div className="glass-panel max-w-md w-full p-10 flex flex-col items-center justify-center relative z-10 animate-scale-in">
          <h1 className="font-headline text-5xl font-bold text-sky-950 mb-8 drop-shadow-md">GAME OVER</h1>
          {gameResult && (
            <div className="flex flex-col items-center bg-white/40 border border-sky-100 rounded-2xl p-6 w-full mb-8 shadow-sm">
              <span className="text-sm font-bold text-sky-600 mb-1">🏆 승자</span>
              <span className="font-headline text-2xl font-bold text-sky-900">{gameResult.nickname}</span>
            </div>
          )}
          <div className="w-full flex flex-col gap-4 mb-10">
            <div className="flex justify-between items-center bg-white/30 px-6 py-4 rounded-xl border border-sky-100/50">
              <span className="font-semibold text-sky-800">MY SCORE</span>
              <span className="font-headline text-2xl font-bold text-sky-600">{score.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center bg-white/30 px-6 py-4 rounded-xl border border-sky-100/50">
              <span className="font-semibold text-sky-800">LINES</span>
              <span className="font-headline text-xl font-bold text-sky-700">{totalLines}</span>
            </div>
            <div className="flex justify-between items-center bg-white/30 px-6 py-4 rounded-xl border border-sky-100/50">
              <span className="font-semibold text-sky-800">LEVEL</span>
              <span className="font-headline text-xl font-bold text-sky-700">{level}</span>
            </div>
          </div>
          <button className="glass-button !w-full h-14 rounded-xl font-bold text-lg" onClick={handleBackToWaiting}>
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
    <div className="bg-atmosphere min-h-screen w-full flex items-center justify-center relative font-body text-sky-950 overflow-hidden" style={{ margin: 0, padding: 0 }}>
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="tetrimino tetrimino-i"></div>
        <div className="tetrimino tetrimino-t"></div>
        <div className="tetrimino tetrimino-l"></div>
        <div className="tetrimino tetrimino-o"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-300/30 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-[1400px] h-screen max-h-[900px] p-6 flex flex-col lg:flex-row gap-6 relative z-10">
        {/* 왼쪽: 점수 패널 */}
        <div className="w-full lg:w-64 flex flex-col h-full shrink-0">
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
        <div className="flex-1 flex justify-center items-center h-full relative min-w-[350px]">
          <GameBoard 
            board={board} 
            currentPiece={currentPiece} 
            ghostY={ghostY} 
            isPaused={isPaused}
            onPauseGame={pauseGame}
            onResumeGame={resumeGame}
          />
          {isGameOver && (
            <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
              <div className="bg-white/80 backdrop-blur-md px-10 py-6 rounded-2xl shadow-2xl border border-sky-100 flex flex-col items-center transform -translate-y-10">
                <span className="font-headline text-5xl font-bold text-red-500 drop-shadow-sm mb-2">GAME OVER</span>
                <span className="text-sky-800 font-medium">결과를 기다리는 중...</span>
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽: 상대방 미니 보드 + 채팅 */}
        <div className="w-full lg:w-80 flex flex-col gap-4 h-full shrink-0">
          <div className="flex-1 grid grid-cols-2 gap-3 auto-rows-fr">
            {opponentEntries.map(op => (
              <MiniBoard
                key={op.id}
                board={op.board}
                nickname={op.nickname}
                alive={op.alive}
              />
            ))}
          </div>
          <div className="h-[300px] shrink-0 flex flex-col">
            <Chat 
              messages={chatMessages} 
              onSendMessage={sendChatMessage} 
              myId={socket?.id} 
              onClearChat={() => setChatMessages([])}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
