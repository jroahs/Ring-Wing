@echo off
echo Starting Ring-Wing Project...
echo.

echo Starting Backend Server...
start "Ring-Wing Backend" cmd /k "cd ring-and-wing-backend && start-server.bat"

timeout /t 2 /nobreak >nul

echo Starting Frontend Server...
start "Ring-Wing Frontend" cmd /k "cd ring-and-wing-frontend && npm run dev"

echo.
echo Both servers starting in separate windows!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.

pause
