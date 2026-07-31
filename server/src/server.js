// ============================================================
//  server.js - Express + Socket.io 메인 서버
// ============================================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  toggleReady,
  isAllReady,
  startGame,
  updatePlayerStats,
  playerGameOver,
  finishGame,
  resetRoom,
  getRoomList,
  getRoom,
  findRoomBySocketId,
  transferHost,
  kickPlayer,
} from './roomManager.js';
import {
  calculateAttack,
  generateGarbageLines,
  determineTargets,
} from './gameLogic.js';

const PORT = Number(process.env.PORT) || 3001;
const VALID_MODES = new Set(['vs', 'sprint', 'practice']);
const configuredOrigins = process.env.CLIENT_ORIGINS
  ?.split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const corsOrigin = configuredOrigins?.length ? configuredOrigins : true;

const app = express();
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '16kb' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
  maxHttpBufferSize: 100_000,
});

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[\u0000-\u001F\u007F]/g, '').slice(0, maxLength);
}

function isValidBoard(board) {
  return Array.isArray(board)
    && board.length === 20
    && board.every(row => Array.isArray(row)
      && row.length === 10
      && row.every(cell => Number.isInteger(cell) && cell >= 0 && cell <= 8));
}

function isAlivePlayer(room, socketId) {
  return room?.status === 'playing'
    && room.players.some(player => player.id === socketId && player.alive);
}

function emitRoomLists() {
  io.emit('room_list_updated', getRoomList());
}

function scheduleRoomReset(roomId) {
  setTimeout(() => {
    const room = resetRoom(roomId);
    if (!room) return;
    io.to(roomId).emit('room_updated', room);
    emitRoomLists();
  }, 5000);
}

function emitGameFinished(roomId, result) {
  io.to(roomId).emit('game_finished', {
    winner: result.winner,
    room: result.room,
    reason: result.reason,
  });
  scheduleRoomReset(roomId);
}

function handleDeparture(socket) {
  const roomId = findRoomBySocketId(socket.id);
  if (!roomId) return;

  const roomBefore = getRoom(roomId);
  const gameResult = isAlivePlayer(roomBefore, socket.id) && roomBefore.mode !== 'practice'
    ? playerGameOver(roomId, socket.id)
    : null;
  const result = leaveRoom(roomId, socket.id);
  socket.leave(roomId);

  if (!result.deleted && result.room) {
    io.to(roomId).emit('room_updated', result.room);
    if (gameResult?.finished) {
      emitGameFinished(roomId, { ...gameResult, room: result.room });
    }
  }
  emitRoomLists();
}

app.get('/api/health', (request, response) => {
  response.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/rooms', (request, response) => {
  response.json(getRoomList());
});

io.on('connection', (socket) => {
  console.log(`[연결] ${socket.id}`);

  socket.on('get_rooms', (callback) => {
    if (typeof callback === 'function') callback(getRoomList());
  });

  socket.on('create_room', (payload = {}, callback) => {
    const acknowledge = typeof callback === 'function' ? callback : () => {};
    if (findRoomBySocketId(socket.id)) {
      acknowledge({ success: false, error: 'ALREADY_IN_ROOM' });
      return;
    }

    const nickname = cleanText(payload.nickname, 16);
    const roomName = cleanText(payload.roomName, 40);
    const mode = VALID_MODES.has(payload.options?.mode) ? payload.options.mode : 'vs';
    if (!nickname) {
      acknowledge({ success: false, error: 'INVALID_NICKNAME' });
      return;
    }

    const room = createRoom(roomName, { mode });
    const result = joinRoom(room.id, socket.id, nickname);
    if (!result.success) {
      acknowledge(result);
      return;
    }

    socket.join(room.id);
    emitRoomLists();
    acknowledge({ success: true, room: result.room });
  });

  socket.on('join_room', (payload = {}, callback) => {
    const acknowledge = typeof callback === 'function' ? callback : () => {};
    if (findRoomBySocketId(socket.id)) {
      acknowledge({ success: false, error: 'ALREADY_IN_ROOM' });
      return;
    }

    const roomId = cleanText(payload.roomId, 64);
    const nickname = cleanText(payload.nickname, 16);
    if (!roomId || !nickname) {
      acknowledge({ success: false, error: 'INVALID_INPUT' });
      return;
    }

    const result = joinRoom(roomId, socket.id, nickname);
    if (!result.success) {
      acknowledge(result);
      return;
    }

    socket.join(roomId);
    io.to(roomId).emit('room_updated', result.room);
    emitRoomLists();
    acknowledge({ success: true, room: result.room });
  });

  socket.on('toggle_ready', () => {
    const roomId = findRoomBySocketId(socket.id);
    if (!roomId) return;

    const room = toggleReady(roomId, socket.id);
    if (!room) return;
    io.to(roomId).emit('room_updated', room);
    if (isAllReady(roomId)) io.to(roomId).emit('all_ready');
  });

  socket.on('start_game', () => {
    const roomId = findRoomBySocketId(socket.id);
    const currentRoom = roomId ? getRoom(roomId) : null;
    if (!currentRoom || currentRoom.hostId !== socket.id || !isAllReady(roomId)) return;

    const room = startGame(roomId);
    if (!room) return;
    io.to(roomId).emit('game_started', room);
    emitRoomLists();
  });

  socket.on('transfer_host', (payload = {}) => {
    const roomId = findRoomBySocketId(socket.id);
    const targetId = cleanText(payload.targetId, 64);
    if (!roomId || !targetId) return;

    const room = transferHost(roomId, socket.id, targetId);
    if (!room) return;
    io.to(roomId).emit('room_updated', room);
    emitRoomLists();
  });

  socket.on('kick_player', (payload = {}) => {
    const roomId = findRoomBySocketId(socket.id);
    const targetId = cleanText(payload.targetId, 64);
    if (!roomId || !targetId) return;

    const result = kickPlayer(roomId, socket.id, targetId);
    if (!result.success) return;

    io.to(targetId).emit('kicked');
    const targetSocket = io.sockets.sockets.get(targetId);
    targetSocket?.leave(roomId);
    io.to(roomId).emit('room_updated', result.room);
    emitRoomLists();
  });

  socket.on('player_state', (state = {}) => {
    const roomId = findRoomBySocketId(socket.id);
    const room = roomId ? getRoom(roomId) : null;
    if (!roomId || !isAlivePlayer(room, socket.id) || !isValidBoard(state.board)) return;

    const score = Number.isSafeInteger(state.score) && state.score >= 0 ? state.score : 0;
    const lines = Number.isSafeInteger(state.lines) && state.lines >= 0 ? state.lines : 0;
    socket.to(roomId).emit('opponent_state', {
      playerId: socket.id,
      board: state.board,
      score,
      lines,
    });
  });

  socket.on('line_clear', (payload = {}) => {
    const roomId = findRoomBySocketId(socket.id);
    const room = roomId ? getRoom(roomId) : null;
    if (!roomId || !isAlivePlayer(room, socket.id)) return;

    const linesCleared = payload.linesCleared;
    const combo = payload.combo;
    const isTSpin = payload.isTSpin === true;
    if (!Number.isInteger(linesCleared) || linesCleared < 1 || linesCleared > 4) return;
    if (!Number.isInteger(combo) || combo < 1 || combo > 100) return;
    const now = Date.now();
    if (now - (socket.data.lastLineClearAt || 0) < 50) return;
    socket.data.lastLineClearAt = now;

    const player = room.players.find(candidate => candidate.id === socket.id);
    const qualifiesForBackToBack = linesCleared === 4 || isTSpin;
    const previousBackToBack = player?.backToBack || 0;
    const isBackToBack = qualifiesForBackToBack && previousBackToBack > 0;
    const nextBackToBack = qualifiesForBackToBack ? previousBackToBack + 1 : 0;

    // B2B는 서버 상태로 계산하고, 서버가 보드를 검증할 수 없는 PC 보너스는 공격에 반영하지 않는다.
    const { attack, score } = calculateAttack(
      linesCleared,
      isTSpin,
      combo,
      isBackToBack,
      false,
    );
    const stats = updatePlayerStats(
      roomId,
      socket.id,
      score,
      linesCleared,
      nextBackToBack,
    );
    if (!stats) return;

    if (attack > 0 && room.mode === 'vs') {
      const alivePlayers = room.players.filter(player => player.alive).map(player => player.id);
      const targets = determineTargets(socket.id, alivePlayers, 'all');
      const garbageLines = generateGarbageLines(attack);

      for (const targetId of targets) {
        io.to(targetId).emit('receive_garbage', {
          fromId: socket.id,
          lines: garbageLines,
        });
      }
      io.to(roomId).emit('attack_effect', {
        attackerId: socket.id,
        targets,
        lineCount: attack,
      });
    }

  });

  socket.on('game_over', (payload = {}) => {
    const roomId = findRoomBySocketId(socket.id);
    const room = roomId ? getRoom(roomId) : null;
    if (!roomId || !isAlivePlayer(room, socket.id)) return;

    const player = room.players.find(candidate => candidate.id === socket.id);
    const isSprintComplete = room.mode === 'sprint'
      && payload.reason === 'sprint-complete'
      && player?.lines >= 40;
    const result = isSprintComplete
      ? finishGame(roomId, socket.id, 'sprint-complete')
      : playerGameOver(roomId, socket.id);
    if (!result) return;

    if (!isSprintComplete) {
      io.to(roomId).emit('player_eliminated', { playerId: socket.id });
    }
    if (result.finished) emitGameFinished(roomId, result);
  });

  socket.on('chat_message', (payload = {}) => {
    const roomId = findRoomBySocketId(socket.id);
    const room = roomId ? getRoom(roomId) : null;
    const player = room?.players.find(candidate => candidate.id === socket.id);
    const message = cleanText(payload.message, 200);
    if (!roomId || !player || !message) return;

    const now = Date.now();
    if (now - (socket.data.lastChatAt || 0) < 250) return;
    socket.data.lastChatAt = now;

    io.to(roomId).emit('chat_message', {
      playerId: socket.id,
      nickname: player.nickname,
      message,
      timestamp: now,
    });
  });

  socket.on('leave_room', (callback) => {
    handleDeparture(socket);
    if (typeof callback === 'function') callback({ success: true });
  });

  socket.on('disconnect', () => {
    console.log(`[연결 해제] ${socket.id}`);
    handleDeparture(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`\nOnline Tetris Server running on http://localhost:${PORT}\n`);
});
