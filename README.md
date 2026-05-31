# 🎮 Online Tetris Battle (4인 대전)

4명의 플레이어가 실시간으로 접속하여 테트리스 대전을 즐길 수 있는 웹 기반 멀티플레이어 게임입니다.

---

## 🏗️ 프로젝트 구조

```
Online_tetris/
├── client/          # 프론트엔드 (Vite + React)
│   └── src/
│       ├── components/   # UI 컴포넌트
│       ├── game/         # 게임 엔진 (순수 로직)
│       ├── hooks/        # React 커스텀 훅
│       └── styles/       # 디자인 시스템
└── server/          # 백엔드 (Node.js + Socket.io)
    └── src/
        ├── server.js       # 메인 서버
        ├── roomManager.js  # 방 관리
        └── gameLogic.js    # 공격/점수 로직
```

---

## 👥 개발자 담당 영역

| 개발자 | 담당 모듈 | 주요 파일 |
|--------|-----------|-----------|
| **A** - 게임 엔진 | 테트리스 코어 로직, 충돌/회전/SRS | `client/src/game/*`, `client/src/hooks/useTetris.js` |
| **B** - 서버/네트워크 | Socket.io 서버, 방 관리, 실시간 통신 | `server/src/*`, `client/src/hooks/useSocket.js` |
| **C** - UI 컴포넌트 | React 컴포넌트 (로비, 보드, 채팅 등) | `client/src/components/*.jsx` |
| **D** - UI/디자인 | CSS 디자인 시스템, 테마, 애니메이션 | `client/src/styles/*`, `client/src/components/*.css` |

> 💡 각 파일 상단에 `담당: 개발자 X` 코멘트가 표기되어 있습니다.

---

## 🚀 실행 방법

### 1. 서버 실행
```bash
cd server
npm install
npm run dev
```
서버가 `http://localhost:3001` 에서 시작됩니다.

### 2. 클라이언트 실행
```bash
cd client
npm install
npm run dev
```
클라이언트가 `http://localhost:5173` 에서 시작됩니다.

### 3. 테스트
브라우저 창 4개를 열고 `http://localhost:5173` 에 접속하여 각각 다른 닉네임으로 입장합니다.

---

## 🎮 게임 조작법

| 키 | 동작 |
|----|------|
| ← → | 좌우 이동 |
| ↓ | 소프트 드롭 |
| Space | 하드 드롭 |
| ↑ | 시계 방향 회전 |
| Z | 반시계 방향 회전 |
| C | 홀드 |

---

## 🛠️ 기술 스택

- **Frontend**: React + Vite + Vanilla CSS
- **Backend**: Node.js + Express + Socket.io
- **Canvas**: HTML5 Canvas API (게임 보드 렌더링)
- **Design**: 사이버펑크 네온 다크 테마 + 글래스모피즘
