// ============================================================
//  useSocket.js - Socket.io 연결 관리 React Hook
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from '../game/constants';

const ACK_TIMEOUT = 5000;

function emitWithAck(socket, event, payload) {
  if (!socket.connected) {
    return Promise.resolve({ success: false, error: 'NOT_CONNECTED' });
  }

  return new Promise((resolve) => {
    socket.timeout(ACK_TIMEOUT).emit(event, payload, (error, result) => {
      if (error) {
        resolve({ success: false, error: 'REQUEST_TIMEOUT' });
        return;
      }
      resolve(result || { success: false, error: 'EMPTY_RESPONSE' });
    });
  });
}

/** Socket.io 연결과 로비/게임 이벤트 전송 API를 관리합니다. */
export function useSocket({ onKickedCallback } = {}) {
  const [socket] = useState(() => io(SERVER_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
  }));
  const [isConnected, setIsConnected] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('get_rooms', (roomList) => {
        setRooms(Array.isArray(roomList) ? roomList : []);
      });
    };
    const handleDisconnect = () => setIsConnected(false);
    const handleRoomList = (roomList) => setRooms(Array.isArray(roomList) ? roomList : []);
    const handleRoomUpdate = (room) => setCurrentRoom(room || null);
    const handleKicked = () => {
      setCurrentRoom(null);
      onKickedCallback?.();
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room_list_updated', handleRoomList);
    socket.on('room_updated', handleRoomUpdate);
    socket.on('kicked', handleKicked);
    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room_list_updated', handleRoomList);
      socket.off('room_updated', handleRoomUpdate);
      socket.off('kicked', handleKicked);
      socket.disconnect();
    };
  }, [onKickedCallback, socket]);

  const createRoom = useCallback(async (roomName, options = {}) => {
    const result = await emitWithAck(socket, 'create_room', { roomName, nickname, options });
    if (result.success) setCurrentRoom(result.room);
    return result;
  }, [nickname, socket]);

  const joinRoom = useCallback(async (roomId) => {
    const result = await emitWithAck(socket, 'join_room', { roomId, nickname });
    if (result.success) setCurrentRoom(result.room);
    return result;
  }, [nickname, socket]);

  const toggleReady = useCallback(() => {
    if (socket.connected) socket.emit('toggle_ready');
  }, [socket]);

  const startGame = useCallback(() => {
    if (socket.connected) socket.emit('start_game');
  }, [socket]);

  const sendPlayerState = useCallback((state) => {
    if (socket.connected) socket.emit('player_state', state);
  }, [socket]);

  const sendLineCleared = useCallback((data) => {
    if (socket.connected) socket.emit('line_clear', data);
  }, [socket]);

  const sendGameOver = useCallback((data = {}) => {
    if (socket.connected) socket.emit('game_over', data);
  }, [socket]);

  const sendChatMessage = useCallback((message) => {
    if (socket.connected) socket.emit('chat_message', { message });
  }, [socket]);

  const transferHost = useCallback((targetId) => {
    if (socket.connected) socket.emit('transfer_host', { targetId });
  }, [socket]);

  const kickPlayer = useCallback((targetId) => {
    if (socket.connected) socket.emit('kick_player', { targetId });
  }, [socket]);

  const leaveRoom = useCallback(() => {
    if (!socket.connected) {
      setCurrentRoom(null);
      return Promise.resolve({ success: false, error: 'NOT_CONNECTED' });
    }

    return new Promise((resolve) => {
      socket.timeout(ACK_TIMEOUT).emit('leave_room', (error, result) => {
        if (error) {
          // ack 유실 시 연결을 재수립해 서버 disconnect 정리를 보장합니다.
          socket.disconnect();
          socket.connect();
          setCurrentRoom(null);
          resolve({ success: true, recovered: true });
          return;
        }
        setCurrentRoom(null);
        resolve(result || { success: true });
      });
    });
  }, [socket]);

  return {
    socket,
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
    transferHost,
    kickPlayer,
    leaveRoom,
  };
}
