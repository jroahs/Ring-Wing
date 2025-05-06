@echo off
echo Starting Ring & Wing backend server with garbage collection enabled...
nodemon --max-old-space-size=512 --expose-gc server.js


