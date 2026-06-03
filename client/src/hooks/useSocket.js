// ============================================================
//  useSocket.js - Socket.io 연결 관리 React Hook
//  담당: 개발자 B (네트워크 담당)
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from '../game/constants';

/**
 * Socket.io 연결을 관리하는 커스텀 훅
 *
 * @returns {{
 *   socket: import('socket.io-client').Socket | null,
 *   isConnected: boolean,
 *   rooms: Array,
 *   currentRoom: object | null,
 *   nickname: string,
 *   setNickname: Function,
 *   createRoom: Function,
 *   joinRoom: Function,
 *   toggleReady: Function,
 *   startGame: Function,
 *   sendPlayerState: Function,
 *   sendLineCleared: Function,
 *   sendGameOver: Function,
 *   sendChatMessage: Function,
 *   sendPauseGame: Function,
 *   sendResumeRequest: Function,
 *   sendResumeAgreed: Function,
 * }}
 */
export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [nickname, setNickname] = useState('');

  // --- 소켓 연결 ---
  useEffect(() => {
    const socket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] 연결됨:', socket.id);
      setIsConnected(true);
      // 최초 연결 시 방 목록 요청
      socket.emit('get_rooms', (roomList) => {
        setRooms(roomList);
      });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] 연결 해제');
      setIsConnected(false);
    });

    // 방 목록 업데이트
    socket.on('room_list_updated', (roomList) => {
      setRooms(roomList);
    });

    // 현재 방 상태 업데이트
    socket.on('room_updated', (room) => {
      setCurrentRoom(room);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // --- 방 생성 ---
  const createRoom = useCallback((roomName) => {
    return new Promise((resolve) => {
      socketRef.current?.emit('create_room', { roomName, nickname }, (result) => {
        if (result.success) setCurrentRoom(result.room);
        resolve(result);
      });
    });
  }, [nickname]);

  // --- 방 입장 ---
  const joinRoom = useCallback((roomId) => {
    return new Promise((resolve) => {
      socketRef.current?.emit('join_room', { roomId, nickname }, (result) => {
        if (result.success) setCurrentRoom(result.room);
        resolve(result);
      });
    });
  }, [nickname]);

  // --- 준비 토글 ---
  const toggleReady = useCallback(() => {
    socketRef.current?.emit('toggle_ready');
  }, []);

  // --- 게임 시작 ---
  const startGame = useCallback(() => {
    socketRef.current?.emit('start_game');
  }, []);

  // --- 플레이어 보드 상태 전송 ---
  const sendPlayerState = useCallback((state) => {
    socketRef.current?.emit('player_state', state);
  }, []);

  // --- 줄 제거 알림 ---
  const sendLineCleared = useCallback((data) => {
    socketRef.current?.emit('line_clear', data);
  }, []);

  // --- 게임 오버 알림 ---
  const sendGameOver = useCallback(() => {
    socketRef.current?.emit('game_over');
  }, []);

  // --- 일시정지 / 재개 동기화 ---
  const sendPauseGame = useCallback(() => {
    socketRef.current?.emit('pause_game');
  }, []);

  const sendResumeRequest = useCallback(() => {
    socketRef.current?.emit('resume_request');
  }, []);

  const sendResumeAgreed = useCallback(() => {
    socketRef.current?.emit('resume_agreed');
  }, []);

  // --- 채팅 메시지 전송 ---
  const sendChatMessage = useCallback((message) => {
    socketRef.current?.emit('chat_message', { message, nickname });
  }, [nickname]);

  return {
    socket: socketRef.current,
    isConnected,
    rooms,
    currentRoom,
    nickname,
    setNickname,
    createRoom,
    joinRoom,
    toggleReady,
    startGame,
    sendPlayerState,
    sendLineCleared,
    sendGameOver,
    sendChatMessage,
    sendPauseGame,
    sendResumeRequest,
    sendResumeAgreed,
  };
}
