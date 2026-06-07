// ============================================================
//  roomManager.js - 방(Room) 생성 / 입장 / 퇴장 관리 모듈
//  담당: 개발자 B (네트워크 & 서버 담당)
// ============================================================

/**
 * rooms Map 구조:
 *   roomId -> {
 *     id: string,
 *     name: string,
 *     players: Map<socketId, { id, nickname, ready, alive }>,
 *     maxPlayers: 4,
 *     status: 'waiting' | 'playing' | 'finished',
 *     createdAt: Date,
 *   }
 */
const rooms = new Map();

let roomIdCounter = 1;

/**
 * 새 방을 생성합니다.
 * @param {string} roomName - 방 이름
 * @returns {object} 생성된 방 정보
 */
export function createRoom(roomName, options = {}) {
  const roomId = `room_${roomIdCounter++}`;
  const room = {
    id: roomId,
    name: roomName || `Room ${roomIdCounter - 1}`,
    players: new Map(),
    maxPlayers: 4,
    status: 'waiting',
    mode: options.mode || 'vs', // 'vs' | 'sprint' | 'practice'
    gravity: options.gravity !== undefined ? parseFloat(options.gravity) : 0.0100,
    createdAt: new Date(),
  };
  rooms.set(roomId, room);
  return serializeRoom(room);
}

/**
 * 플레이어를 방에 입장시킵니다.
 * @param {string} roomId
 * @param {string} socketId
 * @param {string} nickname
 * @returns {{ success: boolean, room?: object, error?: string }}
 */
export function joinRoom(roomId, socketId, nickname) {
  const room = rooms.get(roomId);
  if (!room) return { success: false, error: 'ROOM_NOT_FOUND' };
  if (room.status !== 'waiting') return { success: false, error: 'GAME_ALREADY_STARTED' };
  if (room.players.size >= room.maxPlayers) return { success: false, error: 'ROOM_FULL' };

  room.players.set(socketId, {
    id: socketId,
    nickname,
    ready: false,
    alive: true,
  });

  // 첫 번째로 방에 들어온 사람을 방장으로 지정
  if (!room.hostId) {
    room.hostId = socketId;
  }

  return { success: true, room: serializeRoom(room) };
}

/**
 * 플레이어를 방에서 퇴장시킵니다.
 * @param {string} roomId
 * @param {string} socketId
 * @returns {{ room?: object, deleted: boolean }}
 */
export function leaveRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return { deleted: false };

  room.players.delete(socketId);

  // 방에 아무도 없으면 방 삭제
  if (room.players.size === 0) {
    rooms.delete(roomId);
    return { deleted: true };
  }

  // 방장이 나간 경우, 남은 플레이어 중 첫 번째에게 방장 위임
  if (room.hostId === socketId) {
    room.hostId = [...room.players.keys()][0];
  }

  return { room: serializeRoom(room), deleted: false };
}

/**
 * 플레이어 ready 토글
 */
export function toggleReady(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const player = room.players.get(socketId);
  if (!player) return null;
  player.ready = !player.ready;
  return serializeRoom(room);
}

/**
 * 모든 플레이어가 Ready인지 확인 (혼자일 때는 무조건 시작 가능)
 */
export function isAllReady(roomId) {
  const room = rooms.get(roomId);
  if (!room) return false;
  if (room.players.size === 0) return false;
  // 방에 혼자 있을 때(싱글플레이 모드) 시작 버튼을 누를 수 있도록 true 반환
  if (room.players.size === 1) return true;
  for (const player of room.players.values()) {
    // 방장은 준비(Ready)를 누르지 않고 시작(Start)을 누르므로 방장의 ready 상태는 무시
    if (player.id !== room.hostId && !player.ready) return false;
  }
  return true;
}

/**
 * 게임 시작 상태로 전환
 */
export function startGame(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.status = 'playing';
  // 모든 플레이어를 alive 상태로
  for (const player of room.players.values()) {
    player.alive = true;
  }
  return serializeRoom(room);
}

/**
 * 플레이어 게임오버 처리
 */
export function playerGameOver(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const player = room.players.get(socketId);
  if (player) player.alive = false;

  // 생존자 수 확인
  const alivePlayers = [...room.players.values()].filter(p => p.alive);
  if (alivePlayers.length <= 1) {
    room.status = 'finished';
    return {
      room: serializeRoom(room),
      winner: alivePlayers[0] || null,
      finished: true,
    };
  }

  return { room: serializeRoom(room), finished: false };
}

/**
 * 방 상태를 초기화(대기 상태로 복귀)
 */
export function resetRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.status = 'waiting';
  for (const player of room.players.values()) {
    player.ready = false;
    player.alive = true;
  }
  return serializeRoom(room);
}

/**
 * 방 목록 조회
 */
export function getRoomList() {
  return [...rooms.values()].map(serializeRoom);
}

/**
 * 특정 방 조회
 */
export function getRoom(roomId) {
  const room = rooms.get(roomId);
  return room ? serializeRoom(room) : null;
}

/**
 * 소켓 ID로 해당 플레이어가 속한 방 ID를 찾습니다.
 */
export function findRoomBySocketId(socketId) {
  for (const [roomId, room] of rooms) {
    if (room.players.has(socketId)) return roomId;
  }
  return null;
}

/**
 * 방장 권한 인계
 */
export function transferHost(roomId, fromId, toId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.hostId === fromId && room.players.has(toId)) {
    room.hostId = toId;
    return serializeRoom(room);
  }
  return null;
}

/**
 * 플레이어 추방
 */
export function kickPlayer(roomId, hostId, targetId) {
  const room = rooms.get(roomId);
  if (!room) return { success: false };
  if (room.hostId === hostId && room.players.has(targetId)) {
    room.players.delete(targetId);
    return { success: true, room: serializeRoom(room) };
  }
  return { success: false };
}

/**
 * 방 설정 업데이트 (방장 권한)
 */
export function updateRoomSettings(roomId, hostId, settings) {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.hostId === hostId) {
    if (settings.gravity !== undefined) {
      room.gravity = parseFloat(settings.gravity);
    }
    // 다른 설정이 있다면 여기에 추가
    return serializeRoom(room);
  }
  return null;
}

// ---------- Helpers ----------

function serializeRoom(room) {
  return {
    id: room.id,
    name: room.name,
    hostId: room.hostId,
    players: [...room.players.values()],
    maxPlayers: room.maxPlayers,
    status: room.status,
    mode: room.mode || 'vs',
    gravity: room.gravity !== undefined ? room.gravity : 0.0100,
    playerCount: room.players.size,
  };
}
