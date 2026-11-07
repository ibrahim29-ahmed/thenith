@echo off
echo ============================================================
echo   Thenith Site Launcher - Backend and Frontend
echo ============================================================
echo.
echo Starting Backend Server on http://localhost:4000 ...
start "Thenith Backend (Port 4000)" cmd /k "cd /d "%~dp0SITE\BACKEND" && npm run dev"

echo Starting Frontend Server on https://localhost:3000 ...
start "Thenith Frontend (Port 3000)" cmd /k "cd /d "%~dp0SITE\FRONTEND" && npm run dev"

echo.
echo ============================================================
echo Both servers launched in separate windows!
echo Backend:  http://localhost:4000
echo Frontend: https://localhost:3000
echo ============================================================
