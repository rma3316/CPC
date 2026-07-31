// ============================================================
//  gameLogic.js - 서버 측 게임 로직 (공격 판정, 점수 계산)
//  담당: 개발자 A (게임 엔진 담당)
// ============================================================

// 클라이언트 수신 큐와 동일한 단일 공격 상한입니다.
export const MAX_ATTACK_LINES = 20;

/**
 * 줄 제거 수에 따른 공격(쓰레기) 줄 수 계산
 *
 * - 1줄: 공격 없음 (0)
 * - 2줄: 1줄 공격
 * - 3줄: 2줄 공격
 * - 4줄 (테트리스): 4줄 공격
 *
 * @param {number} linesCleared - 동시에 제거된 줄 수
 * @param {boolean} isTSpin - T-Spin 여부
 * @param {number} combo - 현재 콤보 카운트
 * @param {boolean} isBackToBack - 직전 고난도 클리어와 연속되었는지 여부
 * @param {boolean} isPerfectClear - 줄 제거 후 보드가 완전히 비었는지 여부
 * @returns {{ attack: number, score: number }}
 */
export function calculateAttack(
  linesCleared,
  isTSpin = false,
  combo = 0,
  isBackToBack = false,
  isPerfectClear = false,
) {
  let attack = 0;
  let score = 0;

  // 기본 공격 테이블
  const baseAttack = {
    0: 0,
    1: 0,
    2: 1,
    3: 2,
    4: 4,
  };

  // 기본 점수 테이블
  const baseScore = {
    0: 0,
    1: 100,
    2: 300,
    3: 500,
    4: 800,
  };

  attack = baseAttack[Math.min(linesCleared, 4)] || 0;
  score = baseScore[Math.min(linesCleared, 4)] || 0;

  // T-Spin 보너스
  if (isTSpin) {
    attack += linesCleared * 2;
    score *= 1.5;
  }

  // Back-to-Back 보너스
  if (isBackToBack && (isTSpin || linesCleared === 4)) {
    attack += 1;
    score = Math.floor(score * 1.5);
  }

  // Perfect Clear는 보드 전체를 비운 고난도 플레이이므로 큰 보너스를 줍니다.
  if (isPerfectClear) {
    attack += 10;
    score += 2000;
  }

  // 콤보 보너스 (2콤보부터)
  if (combo >= 2) {
    const comboBonus = Math.floor(combo / 2);
    attack += comboBonus;
    score += combo * 50;
  }

  return {
    attack: Math.min(MAX_ATTACK_LINES, Math.floor(attack)),
    score: Math.floor(score),
  };
}

/**
 * 쓰레기 줄(Garbage Lines) 데이터를 생성합니다.
 * 랜덤한 하나의 빈 칸(hole)이 있는 줄을 생성합니다.
 *
 * @param {number} count - 생성할 쓰레기 줄 수
 * @param {number} boardWidth - 보드 가로 칸 수 (기본 10)
 * @returns {number[][]} 쓰레기 줄 배열 (0 = 빈 칸, 8 = 쓰레기 블록)
 */
export function generateGarbageLines(count, boardWidth = 10) {
  const lines = [];
  // 모든 줄에서 동일한 구멍 위치 (가이드라인 준수)
  const holePosition = Math.floor(Math.random() * boardWidth);

  for (let i = 0; i < count; i++) {
    const line = new Array(boardWidth).fill(8); // 8 = garbage block
    line[holePosition] = 0;
    lines.push(line);
  }
  return lines;
}

/**
 * 공격 대상을 결정합니다.
 *
 * 모드:
 *  - 'all': 자신을 제외한 모든 플레이어에게 공격
 *  - 'random': 랜덤한 한 명에게 집중 공격
 *  - 'targeted': 특정 플레이어에게 공격
 *
 * @param {string} attackerId - 공격자 소켓 ID
 * @param {string[]} alivePlayers - 생존 중인 플레이어 ID 배열
 * @param {string} mode - 공격 모드
 * @param {string} [targetId] - targeted 모드일 때 대상 ID
 * @returns {string[]} 공격 받을 플레이어 ID 배열
 */
export function determineTargets(attackerId, alivePlayers, mode = 'all', targetId = null) {
  const others = alivePlayers.filter(id => id !== attackerId);
  if (others.length === 0) return [];

  switch (mode) {
    case 'random': {
      const idx = Math.floor(Math.random() * others.length);
      return [others[idx]];
    }
    case 'targeted': {
      if (targetId && others.includes(targetId)) return [targetId];
      // fallback to random
      const fallbackIdx = Math.floor(Math.random() * others.length);
      return [others[fallbackIdx]];
    }
    case 'all':
    default:
      return others;
  }
}
