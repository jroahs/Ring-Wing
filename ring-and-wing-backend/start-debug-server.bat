@echo off
echo Starting Ring & Wing Backend Server...
cd %~dp0
echo Current directory: %CD%

REM Ensure environment variables are set
set JWT_SECRET=your-ring-and-wing-secret-key
set NODE_ENV=development

REM Start the server with garbage collection enabled
echo Starting server with memory optimization...
node --expose-gc server.js

REM If server exits, pause to read any error messages
pause
