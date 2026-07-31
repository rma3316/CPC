// ============================================================
//  roomManager.js - 인메모리 방과 플레이어 상태 관리
// ============================================================

const rooms = new Map();
const VALID_MODES = new Set(['vs', 'sprint', 'practice']);
let roomIdCounter = 1;

export function createRoom(roomName, options = {}) {
  const roomId = `room_${roomIdCounter++}`;
  const room = {
    id: roomId,
    name: roomName || `Room ${roomIdCounter - 1}`,
    players: new Map(),
    maxPlayers: 4,
    status: 'waiting',
    mode: VALID_MODES.has(options.mode) ? options.mode : 'vs',
    createdAt: new Date(),
  };
  rooms.set(roomId, room);
  return serializeRoom(room);
}

export function joinRoom(roomId, socketId, nickname) {
  const room = rooms.get(roomId);
  if (!room) return { success: false, error: 'ROOM_NOT_FOUND' };
  if (room.status !== 'waiting') return { success: false, error: 'GAME_ALREADY_STARTED' };
  if (room.players.has(socketId)) return { success: false, error: 'ALREADY_IN_ROOM' };
  if (room.players.size >= room.maxPlayers) return { success: false, error: 'ROOM_FULL' };

  room.players.set(socketId, {
    id: socketId,
    nickname,
    ready: false,
    alive: true,
    score: 0,
    lines: 0,
    backToBack: 0,
  });

  if (!room.hostId) room.hostId = socketId;
  return { success: true, room: serializeRoom(room) };
}

export function leaveRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return { deleted: false };

  room.players.delete(socketId);
  if (room.players.size === 0) {
    rooms.delete(roomId);
    return { deleted: true };
  }

  if (room.hostId === socketId) room.hostId = room.players.keys().next().value;
  return { room: serializeRoom(room), deleted: false };
}

export function toggleReady(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'waiting' || room.hostId === socketId) return null;
  const player = room.players.get(socketId);
  if (!player) return null;
  player.ready = !player.ready;
  return serializeRoom(room);
}

export function isAllReady(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'waiting' || room.players.size === 0) return false;
  return [...room.players.values()]
    .filter(player => player.id !== room.hostId)
    .every(player => player.ready);
}

export function startGame(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'waiting') return null;

  room.status = 'playing';
  for (const player of room.players.values()) {
    player.alive = true;
    player.score = 0;
    player.lines = 0;
    player.backToBack = 0;
  }
  return serializeRoom(room);
}

export function updatePlayerStats(
  roomId,
  socketId,
  scoreDelta,
  linesCleared,
  backToBack = 0,
) {
  const room = rooms.get(roomId);
  const player = room?.players.get(socketId);
  if (!room || room.status !== 'playing' || !player?.alive) return null;

  player.score += scoreDelta;
  player.lines += linesCleared;
  player.backToBack = Number.isInteger(backToBack) && backToBack >= 0 ? backToBack : 0;
  return {
    playerId: socketId,
    totalScore: player.score,
    totalLines: player.lines,
    backToBack: player.backToBack,
  };
}

export function playerGameOver(roomId, socketId) {
  const room = rooms.get(roomId);
  const player = room?.players.get(socketId);
  if (!room || room.status !== 'playing' || !player?.alive) return null;

  player.alive = false;
  const alivePlayers = [...room.players.values()].filter(candidate => candidate.alive);
  if (alivePlayers.length <= 1) {
    room.status = 'finished';
    return {
      room: serializeRoom(room),
      winner: alivePlayers[0] || null,
      finished: true,
      reason: 'last-player-standing',
    };
  }

  return { room: serializeRoom(room), finished: false };
}

export function finishGame(roomId, winnerId, reason = 'completed') {
  const room = rooms.get(roomId);
  const winner = room?.players.get(winnerId);
  if (!room || room.status !== 'playing' || !winner?.alive) return null;

  room.status = 'finished';
  return {
    room: serializeRoom(room),
    winner: { ...winner },
    finished: true,
    reason,
  };
}

export function resetRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.status = 'waiting';
  for (const player of room.players.values()) {
    player.ready = false;
    player.alive = true;
    player.score = 0;
    player.lines = 0;
    player.backToBack = 0;
  }
  return serializeRoom(room);
}

export function getRoomList() {
  return [...rooms.values()].map(serializeRoom);
}

export function getRoom(roomId) {
  const room = rooms.get(roomId);
  return room ? serializeRoom(room) : null;
}

export function findRoomBySocketId(socketId) {
  for (const [roomId, room] of rooms) {
    if (room.players.has(socketId)) return roomId;
  }
  return null;
}

export function transferHost(roomId, fromId, toId) {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'waiting') return null;
  if (room.hostId !== fromId || fromId === toId || !room.players.has(toId)) return null;

  room.hostId = toId;
  room.players.get(toId).ready = false;
  return serializeRoom(room);
}

export function kickPlayer(roomId, hostId, targetId) {
  const room = rooms.get(roomId);
  if (!room) return { success: false, error: 'ROOM_NOT_FOUND' };
  if (room.status !== 'waiting') return { success: false, error: 'GAME_ALREADY_STARTED' };
  if (room.hostId !== hostId) return { success: false, error: 'NOT_HOST' };
  if (hostId === targetId || !room.players.has(targetId)) {
    return { success: false, error: 'INVALID_TARGET' };
  }

  room.players.delete(targetId);
  return { success: true, room: serializeRoom(room) };
}

function serializeRoom(room) {
  return {
    id: room.id,
    name: room.name,
    hostId: room.hostId,
    players: [...room.players.values()].map(player => ({ ...player })),
    maxPlayers: room.maxPlayers,
    status: room.status,
    mode: room.mode,
    playerCount: room.players.size,
  };
}
