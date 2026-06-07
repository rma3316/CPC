@echo off
chcp 65001 > nul

echo [1/2] Starting Server (Port 3001)...
start "Tetric Server" cmd /k "cd server && npm run dev"

echo [2/2] Starting Client (Vite)...
start "Tetric Client" cmd /k "cd client && npm run dev"
pause
