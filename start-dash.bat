@echo off
echo ============================================================
echo   Thenith Dashboard Launcher - Backend and Frontend
echo ============================================================
echo.
echo Starting Dash Backend Server on http://localhost:4001 ...
start "Thenith Dash Backend (Port 4001)" cmd /k "cd /d "%~dp0DASH\back" && npm run dev"

echo Starting Dash Frontend Server on http://localhost:3001 ...
start "Thenith Dash Frontend (Port 3001)" cmd /k "cd /d "%~dp0DASH\front" && npm run dev"

echo.
echo ============================================================
echo Both servers launched in separate windows!
echo Backend:  http://localhost:4001
echo Frontend: http://localhost:3001
echo ============================================================
