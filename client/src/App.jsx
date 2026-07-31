// ============================================================
//  App.jsx - 메인 앱 (Lobby → WaitingRoom → Game 화면 전환)
//  담당: 전체 통합
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { useTetris } from './hooks/useTetris';
import { useSettings } from './hooks/useSettings';
import { useGameSounds } from './hooks/useGameSounds';
import Lobby from './components/Lobby';
import WaitingRoom from './components/WaitingRoom';
import GameBoard from './components/GameBoard';
import MiniBoard from './components/MiniBoard';
import ScorePanel from './components/ScorePanel';
import Chat from './components/Chat';
import LoginScreen from './components/LoginScreen';
import ModeSelection from './components/ModeSelection';
import SettingsModal from './components/SettingsModal';
import './App.css';

const SOCKET_ERROR_MESSAGES = {
  NOT_CONNECTED: '서버에 연결되어 있지 않습니다.',
  REQUEST_TIMEOUT: '서버 응답 시간이 초과되었습니다.',
  ROOM_NOT_FOUND: '방을 찾을 수 없습니다.',
  ROOM_FULL: '방이 가득 찼습니다.',
  GAME_ALREADY_STARTED: '이미 게임이 시작된 방입니다.',
  ALREADY_IN_ROOM: '이미 다른 방에 입장해 있습니다.',
  INVALID_INPUT: '입력값을 확인해 주세요.',
  INVALID_NICKNAME: '닉네임을 확인해 주세요.',
};

function showSocketError(result) {
  const message = SOCKET_ERROR_MESSAGES[result?.error] || '요청을 처리하지 못했습니다.';
  window.alert(message);
}

/**
 * 앱 상태 흐름:
 *   'lobby' → 'waiting' → 'playing' → 'result' → 'waiting'
 */
export default function App() {
  const [screen, setScreen] = useState('login'); // login | mode | lobby | waiting | playing | result
  const [playType, setPlayType] = useState('multi'); // 'single' | 'multi'
  const [gameMode, setGameMode] = useState('vs'); // 'vs' | 'sprint' | 'marathon' | 'practice'
  const [chatMessages, setChatMessages] = useState([]);
  const [opponents, setOpponents] = useState({});
  const [allReady, setAllReady] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [attackNotice, setAttackNotice] = useState(null);

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

  const { keys, updateKey, volume, setVolume, fontTheme, setFontTheme } = useSettings();
  const playSound = useGameSounds(volume);

  const handleLineCleared = useCallback((data) => {
    if (playType === 'multi' && gameMode !== 'practice') {
      sendLineCleared(data);
    }
  }, [gameMode, playType, sendLineCleared]);

  const handleTetrisGameOver = useCallback(({ reason } = {}) => {
    if (playType === 'multi') {
      sendGameOver({ reason });
      return;
    }

    setGameResult({ nickname: '나', reason });
    setScreen('result');
  }, [playType, sendGameOver]);

  const handleStateUpdate = useCallback((state) => {
    if (playType === 'multi') sendPlayerState(state);
  }, [playType, sendPlayerState]);

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
    combo,
    elapsedTime,
    ghostY,
    startGame: tetrisStartGame,
    receiveGarbage,
    isPaused,
    pauseGame,
    resumeGame,
    stopGame,
  } = useTetris({
    onLineCleared: handleLineCleared,
    onGameOver: handleTetrisGameOver,
    onStateUpdate: handleStateUpdate,
    onSound: playSound,
    keys,
    canReset: playType === 'single',
  });

  // --- 소켓 이벤트 리스너 ---
  useEffect(() => {
    const handlers = {
      chat_message: (message) => {
        setChatMessages(previous => [...previous.slice(-99), message]);
      },
      all_ready: () => setAllReady(true),
      room_updated: (room) => {
        if (room?.mode) setGameMode(room.mode);
        const players = room?.players || [];
        const othersReady = players
          .filter(player => player.id !== room?.hostId)
          .every(player => player.ready);
        setAllReady(players.length > 0 && othersReady);
      },
      game_started: (room) => {
        const roomMode = room?.mode || gameMode;
        setGameMode(roomMode);
        setScreen('playing');
        setChatMessages([]);
        setOpponents({});
        setGameResult(null);
        tetrisStartGame({ mode: roomMode });
      },
      opponent_state: ({ playerId, board: opponentBoard, score: opponentScore, lines }) => {
        setOpponents(previous => ({
          ...previous,
          [playerId]: {
            ...(previous[playerId] || {}),
            board: opponentBoard,
            score: opponentScore,
            lines,
          },
        }));
      },
      receive_garbage: ({ lines }) => receiveGarbage(lines),
      player_eliminated: ({ playerId }) => {
        setOpponents(previous => ({
          ...previous,
          [playerId]: { ...(previous[playerId] || {}), alive: false },
        }));
      },
      attack_effect: ({ attackerId, targets, lineCount }) => {
        if (attackerId === socket.id) {
          setAttackNotice({ type: 'sent', text: `${lineCount}줄 공격!` });
        } else if (targets?.includes(socket.id)) {
          setAttackNotice({ type: 'received', text: `${lineCount}줄 공격 받음!` });
        }
      },
      game_finished: ({ winner, reason }) => {
        stopGame();
        setGameResult(winner ? { ...winner, reason } : { reason });
        setScreen('result');
      },
    };

    for (const [event, handler] of Object.entries(handlers)) socket.on(event, handler);
    return () => {
      for (const [event, handler] of Object.entries(handlers)) socket.off(event, handler);
    };
  }, [gameMode, receiveGarbage, socket, stopGame, tetrisStartGame]);

  useEffect(() => {
    if (!attackNotice) return undefined;
    const timer = setTimeout(() => setAttackNotice(null), 1200);
    return () => clearTimeout(timer);
  }, [attackNotice]);

  // --- 핸들러 ---
  const handleCreateRoom = useCallback(async (roomName, mode) => {
    const selectedMode = mode || gameMode;
    const result = await createRoom(roomName, { mode: selectedMode });
    if (result.success) {
      setGameMode(result.room?.mode || selectedMode);
      setScreen('waiting');
      setChatMessages([]);
    } else {
      showSocketError(result);
    }
  }, [createRoom, gameMode]);

  const handleJoinRoom = useCallback(async (roomId) => {
    const result = await joinRoom(roomId);
    if (result.success) {
      // 참여한 방의 모드를 gameMode에 동기화
      setGameMode(result.room.mode || 'vs');
      setScreen('waiting');
      setChatMessages([]);
    } else {
      showSocketError(result);
    }
  }, [joinRoom]);

  const handleStartGame = useCallback(() => {
    socketStartGame();
  }, [socketStartGame]);

  const handleBackToWaiting = useCallback(() => {
    if (playType === 'single') {
      setScreen('mode');
    } else {
      setScreen('waiting');
    }
    setGameResult(null);
  }, [playType]);

  const handleLeaveRoom = useCallback(async () => {
    await leaveRoom();
    setScreen('lobby');
    setChatMessages([]);
  }, [leaveRoom]);

  const handleSetNickname = (name) => {
    setNickname(name);
    setScreen('mode');
  };

  const handleSelectMode = ({ playType, mode }) => {
    setPlayType(playType);
    setGameMode(mode);
    if (playType === 'single') {
      setScreen('playing');
      setChatMessages([]);
      setOpponents({});
      tetrisStartGame({ mode });
    } else {
      setScreen('lobby');
    }
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleGoHome = useCallback(async () => {
    if (screen === 'playing') stopGame();
    if (playType === 'multi' && (screen === 'waiting' || screen === 'playing')) {
      await leaveRoom();
    }
    if (screen !== 'login') {
      setScreen('mode');
    }
    setGameResult(null);
  }, [playType, screen, leaveRoom, stopGame]);

  // --- 화면 렌더링 ---
  const renderScreen = () => {
    if (screen === 'login') {
      return <LoginScreen onSetNickname={handleSetNickname} />;
    }

    if (screen === 'mode') {
      return (
        <ModeSelection 
          onSelectMode={handleSelectMode} 
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      );
    }

    if (screen === 'lobby') {
      return (
        <Lobby
          nickname={nickname}
          rooms={rooms}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          isConnected={isConnected}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onGoBack={() => setScreen('mode')}
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
            <h1 className="font-headline text-5xl font-bold text-sky-950 mb-8 drop-shadow-md">
              {gameResult?.reason === 'sprint-complete' ? 'SPRINT COMPLETE' : 'GAME OVER'}
            </h1>
            {gameResult?.nickname && playType === 'multi' && (
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
              {gameMode === 'sprint' && (
                <div className="flex justify-between items-center bg-white/30 px-6 py-4 rounded-xl border border-sky-100/50">
                  <span className="font-semibold text-sky-800">TIME</span>
                  <span className="font-headline text-xl font-bold text-sky-700">{(elapsedTime / 1000).toFixed(1)}s</span>
                </div>
              )}
            </div>
            <div className="flex w-full gap-4">
              <button className="glass-button flex-1 h-14 rounded-xl font-bold text-lg" onClick={handleBackToWaiting}>
                {playType === 'single' ? '모드 선택으로' : '대기실로'}
              </button>
              <button className="glass-button flex-1 h-14 rounded-xl font-bold text-lg border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300" onClick={handleGoHome}>
                홈으로
              </button>
            </div>
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

        {attackNotice && (
          <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl font-headline font-bold text-lg shadow-xl animate-scale-in ${
            attackNotice.type === 'sent'
              ? 'bg-emerald-500 text-white'
              : 'bg-rose-500 text-white'
          }`}>
            {attackNotice.text}
          </div>
        )}

        <div className="w-full max-w-[1400px] h-screen max-h-[900px] p-6 flex flex-col lg:flex-row gap-6 relative z-10 justify-center">
          {/* 왼쪽: 점수 패널 */}
          <div className="w-full lg:w-64 flex flex-col h-full shrink-0">
            <ScorePanel
              score={score}
              level={level}
              totalLines={totalLines}
              combo={combo}
              elapsedTime={elapsedTime}
              holdPiece={holdPiece}
              nextPieces={nextPieces}
            />
          </div>

          {/* 중앙: 메인 보드 */}
          <div className="flex-1 flex justify-center items-center h-full relative min-w-[350px] max-w-[500px]">
            <GameBoard 
              board={board} 
              currentPiece={currentPiece} 
              ghostY={ghostY} 
              isPaused={isPaused}
              canPause={playType === 'single' || gameMode === 'practice'}
              onPauseGame={pauseGame}
              onResumeGame={resumeGame}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onGoHome={handleGoHome}
            />
            {isGameOver && (
              <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                <div className="bg-white/80 backdrop-blur-md px-10 py-6 rounded-2xl shadow-2xl border border-sky-100 flex flex-col items-center transform -translate-y-10">
                  <span className="font-headline text-5xl font-bold text-red-500 drop-shadow-sm mb-2">GAME OVER</span>
                  {playType === 'multi' && <span className="text-sky-800 font-medium">결과를 기다리는 중...</span>}
                </div>
              </div>
            )}
          </div>

          {/* 오른쪽: 싱글플레이면 숨김, 멀티플레이면 상대방 미니 보드 + 채팅 */}
          {playType === 'multi' && (
            <div className="w-full lg:w-80 flex flex-col gap-4 h-full shrink-0">
              <div className="flex-1 grid grid-cols-2 gap-3 auto-rows-fr">
                {opponentEntries.map(op => (
                  <MiniBoard
                    key={op.id}
                    board={op.board}
                    nickname={op.nickname}
                    alive={op.alive}
                    score={opponents[op.id]?.score ?? op.score ?? 0}
                    lines={opponents[op.id]?.lines ?? op.lines ?? 0}
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
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderScreen()}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        keys={keys}
        updateKey={updateKey}
        volume={volume}
        setVolume={setVolume}
        fontTheme={fontTheme}
        setFontTheme={setFontTheme}
      />
    </>
  );
}
