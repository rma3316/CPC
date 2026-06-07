// ============================================================
//  server.js - Express + Socket.io 메인 서버
//  담당: 개발자 B (네트워크 & 서버 담당)
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
  playerGameOver,
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

// ---------- 서버 초기화 ----------
const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // 개발 중에는 모든 origin 허용. 배포 시 제한 필요.
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

// ---------- REST API (간단한 상태 확인용) ----------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/rooms', (req, res) => {
  res.json(getRoomList());
});

// ---------- Socket.io 이벤트 처리 ----------
io.on('connection', (socket) => {
  console.log(`[연결] ${socket.id}`);

  // --- 로비: 방 목록 요청 ---
  socket.on('get_rooms', (callback) => {
    callback(getRoomList());
  });

  // --- 방 생성 ---
  socket.on('create_room', ({ roomName, nickname, options }, callback) => {
    const room = createRoom(roomName, options);
    const result = joinRoom(room.id, socket.id, nickname);
    if (result.success) {
      socket.join(room.id);
      io.emit('room_list_updated', getRoomList());
      callback({ success: true, room: result.room });
    } else {
      callback({ success: false, error: result.error });
    }
  });

  // --- 방 입장 ---
  socket.on('join_room', ({ roomId, nickname }, callback) => {
    const result = joinRoom(roomId, socket.id, nickname);
    if (result.success) {
      socket.join(roomId);
      io.to(roomId).emit('room_updated', result.room);
      io.emit('room_list_updated', getRoomList());
      callback({ success: true, room: result.room });
    } else {
      callback({ success: false, error: result.error });
    }
  });

  // --- 준비 토글 ---
  socket.on('toggle_ready', () => {
    const roomId = findRoomBySocketId(socket.id);
    if (!roomId) return;

    const room = toggleReady(roomId, socket.id);
    if (room) {
      io.to(roomId).emit('room_updated', room);

      // 모든 플레이어가 준비 완료되면 게임 시작 가능 알림
      if (isAllReady(roomId)) {
        io.to(roomId).emit('all_ready');
      }
    }
  });

  // --- 게임 시작 ---
  socket.on('start_game', () => {
    const roomId = findRoomBySocketId(socket.id);
    if (!roomId) return;
    if (!isAllReady(roomId)) return;

    const room = startGame(roomId);
    if (room) {
      io.to(roomId).emit('game_started', room);
      io.emit('room_list_updated', getRoomList());
    }
  });

  // --- 방장 위임 ---
  socket.on('transfer_host', ({ targetId }) => {
    const roomId = findRoomBySocketId(socket.id);
    if (!roomId) return;
    const room = transferHost(roomId, socket.id, targetId);
    if (room) {
      io.to(roomId).emit('room_updated', room);
      io.emit('room_list_updated', getRoomList());
    }
  });

  // --- 플레이어 추방 ---
  socket.on('kick_player', ({ targetId }) => {
    const roomId = findRoomBySocketId(socket.id);
    if (!roomId) return;
    const result = kickPlayer(roomId, socket.id, targetId);
    if (result.success) {
      // 추방당한 클라이언트에게 알림
      io.to(targetId).emit('kicked');
      io.to(roomId).emit('room_updated', result.room);
      io.emit('room_list_updated', getRoomList());
      
      // 소켓 객체에 접근해서 room에서 내보내기
      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
        targetSocket.leave(roomId);
      }
    }
  });

  // --- 플레이어 보드 상태 브로드캐스트 ---
  socket.on('player_state', (state) => {
    const roomId = findRoomBySocketId(socket.id);
    if (!roomId) return;

    // 자신을 제외한 같은 방의 다른 플레이어들에게 전송
    socket.to(roomId).emit('opponent_state', {
      playerId: socket.id,
      ...state,
    });
  });

  // --- 줄 제거 / 공격 ---
  socket.on('line_clear', ({ linesCleared, isTSpin, combo }) => {
    const roomId = findRoomBySocketId(socket.id);
    if (!roomId) return;

    const room = getRoom(roomId);
    if (!room) return;

    // practice/sprint 모드에서는 공격을 보내지 않음
    const roomMode = room.mode || 'vs';
    const shouldAttack = roomMode === 'vs';

    const { attack, score } = calculateAttack(linesCleared, isTSpin, combo);

    // 공격이 있을 경우 대상에게 쓰레기 줄 전송 (VS 모드만)
    if (attack > 0 && shouldAttack) {
      const alivePlayers = room.players
        .filter(p => p.alive)
        .map(p => p.id);

      const targets = determineTargets(socket.id, alivePlayers, 'all');
      const garbageLines = generateGarbageLines(attack);

      targets.forEach(targetId => {
        io.to(targetId).emit('receive_garbage', {
          fromId: socket.id,
          lines: garbageLines,
        });
      });

      // 공격 이펙트 알림 (UI 연출용)
      io.to(roomId).emit('attack_effect', {
        attackerId: socket.id,
        targets,
        lineCount: attack,
      });
    }

    // 점수 업데이트 알림
    io.to(roomId).emit('score_update', {
      playerId: socket.id,
      score,
      linesCleared,
    });
  });

  // --- 게임 오버 ---
  socket.on('game_over', () => {
    const roomId = findRoomBySocketId(socket.id);
    if (!roomId) return;

    const result = playerGameOver(roomId, socket.id);
    if (!result) return;

    io.to(roomId).emit('player_eliminated', { playerId: socket.id });

    if (result.finished) {
      io.to(roomId).emit('game_finished', {
        winner: result.winner,
        room: result.room,
      });

      // 잠시 후 방 상태 초기화
      setTimeout(() => {
        const resetted = resetRoom(roomId);
        if (resetted) {
          io.to(roomId).emit('room_updated', resetted);
          io.emit('room_list_updated', getRoomList());
        }
      }, 5000);
    }
  });

  // --- 채팅 ---
  socket.on('chat_message', ({ message, nickname }) => {
    const roomId = findRoomBySocketId(socket.id);
    if (!roomId) return;

    io.to(roomId).emit('chat_message', {
      playerId: socket.id,
      nickname,
      message,
      timestamp: Date.now(),
    });
  });

  // --- 방 나가기 ---
  socket.on('leave_room', (callback) => {
    const roomId = findRoomBySocketId(socket.id);
    if (!roomId) {
      if (callback) callback();
      return;
    }
    const result = leaveRoom(roomId, socket.id);
    if (!result.deleted && result.room) {
      io.to(roomId).emit('room_updated', result.room);
      // 게임 중이었다면 게임오버 처리
      if (result.room.status === 'playing') {
        const gameResult = playerGameOver(roomId, socket.id);
        if (gameResult?.finished) {
          io.to(roomId).emit('game_finished', {
            winner: gameResult.winner,
            room: gameResult.room,
          });
        }
      }
    }
    socket.leave(roomId);
    io.emit('room_list_updated', getRoomList());
    if (callback) callback();
  });

  // --- 연결 해제 ---
  socket.on('disconnect', () => {
    console.log(`[연결 해제] ${socket.id}`);
    const roomId = findRoomBySocketId(socket.id);
    if (!roomId) return;

    const result = leaveRoom(roomId, socket.id);
    if (!result.deleted && result.room) {
      io.to(roomId).emit('room_updated', result.room);

      // 게임 중이었다면 게임오버 처리도 진행
      if (result.room.status === 'playing') {
        const gameResult = playerGameOver(roomId, socket.id);
        if (gameResult?.finished) {
          io.to(roomId).emit('game_finished', {
            winner: gameResult.winner,
            room: gameResult.room,
          });
        }
      }
    }
    io.emit('room_list_updated', getRoomList());
  });
});

// ---------- 서버 시작 ----------
httpServer.listen(PORT, () => {
  console.log(`\n🎮 Online Tetris Server running on http://localhost:${PORT}\n`);
});
