// ============================================================
//  constants.js - 게임 상수 정의
//  담당: 개발자 A (게임 엔진 담당)
// ============================================================

/** 보드 가로 셀 수 */
export const BOARD_WIDTH = 10;

/** 보드 세로 셀 수 (버퍼 포함) */
export const BOARD_HEIGHT = 20;

/** 보이지 않는 상단 버퍼 줄 수 */
export const BUFFER_ZONE = 2;

/** 셀 크기 (px) - 메인 보드 */
export const CELL_SIZE = 30;

/** 셀 크기 (px) - 미니 보드(상대방) */
export const MINI_CELL_SIZE = 12;

/** 초기 낙하 속도 (ms) */
export const INITIAL_DROP_SPEED = 1000;

/** 레벨당 속도 감소 (ms) */
export const SPEED_DECREASE_PER_LEVEL = 50;

/** 최소 낙하 속도 (ms) */
export const MIN_DROP_SPEED = 100;

/** 레벨 업 기준 줄 수 */
export const LINES_PER_LEVEL = 10;

/** 소프트 드롭 배속 */
export const SOFT_DROP_MULTIPLIER = 20;

/** 잠금 딜레이 (ms) - Lock Delay */
export const LOCK_DELAY = 500;

/** 최대 잠금 딜레이 리셋 횟수 */
export const MAX_LOCK_RESETS = 15;

/** DAS - Delayed Auto Shift (ms) */
export const DAS = 133;

/** ARR - Auto Repeat Rate (ms) */
export const ARR = 10;

/** 서버 URL */
export const SERVER_URL = 'http://localhost:3001';

/** 키 매핑 */
export const KEY_BINDINGS = {
  MOVE_LEFT: 'ArrowLeft',
  MOVE_RIGHT: 'ArrowRight',
  SOFT_DROP: 'ArrowDown',
  HARD_DROP: ' ',             // Space
  ROTATE_CW: 'ArrowUp',      // 시계 방향 회전
  ROTATE_CCW: 'z',            // 반시계 방향 회전
  HOLD: 'c',                  // Hold
};

/** 테트로미노 색상 (인덱스별) */
export const PIECE_COLORS = {
  0: 'transparent',    // 빈 칸
  1: '#00f0f0',        // I - 시안
  2: '#0000f0',        // J - 블루
  3: '#f0a000',        // L - 오렌지
  4: '#f0f000',        // O - 옐로우
  5: '#00f000',        // S - 그린
  6: '#a000f0',        // T - 퍼플
  7: '#f00000',        // Z - 레드
  8: '#808080',        // Garbage - 그레이
};

/** 테트로미노 네온 글로우 색상 */
export const PIECE_GLOW_COLORS = {
  1: '#00f0f088',
  2: '#0000f088',
  3: '#f0a00088',
  4: '#f0f00088',
  5: '#00f00088',
  6: '#a000f088',
  7: '#f0000088',
  8: '#80808044',
};
