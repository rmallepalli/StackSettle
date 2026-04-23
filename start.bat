@echo off
SET PATH=%PATH%;C:\Program Files\nodejs

echo Starting StackSettle...
echo.
echo Backend  → http://localhost:3001
echo Frontend → http://localhost:5173
echo.
echo Press Ctrl+C in each window to stop.
echo.

start "StackSettle - Server" cmd /k "cd /d "%~dp0server" && npm run dev"
timeout /t 3 /nobreak >nul
start "StackSettle - Client" cmd /k "cd /d "%~dp0client" && npm run dev"
timeout /t 5 /nobreak >nul
start http://localhost:5173
