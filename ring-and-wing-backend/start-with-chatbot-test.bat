@echo off
echo =======================================
echo Ring & Wing Chatbot Testing Environment
echo =======================================
echo.
echo Available tests and diagnostic tools:
echo 1. Chatbot test page: http://localhost:5000/chatbot-test.html
echo 2. Run the test script: node test-chatbot.js
echo 3. API diagnostics: node gemini-diagnostics.js
echo.
echo Starting the backend server...
echo.
echo Press Ctrl+C to stop the server
echo =======================================
echo.

node server.js
