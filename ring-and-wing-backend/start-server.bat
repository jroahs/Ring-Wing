@echo off
echo Starting Ring and Wing backend server with garbage collection enabled...

REM Set environment variables
set JWT_SECRET=your-ring-and-wing-jwt-secret-key
set NODE_ENV=development

REM Start the server with nodemon
nodemon --max-old-space-size=512 --expose-gc server.js


