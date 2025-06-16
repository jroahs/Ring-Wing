@echo off
setlocal enabledelayedexpansion
echo Installing Ring-Wing Project Dependencies...
echo.

echo [1/2] Installing Backend Dependencies...
cd ring-and-wing-backend
echo Running npm install...
call npm install
echo Running npm audit fix...
call npm audit fix
echo Returning to root directory...
cd ..
echo Backend done!
echo.

echo [2/2] Installing Frontend Dependencies...
cd ring-and-wing-frontend
echo Running npm install...
call npm install
echo Running npm audit fix...
call npm audit fix
echo Returning to root directory...
cd ..
echo Frontend done!
echo.

echo.
echo ============================================
echo Setup Complete!
echo ============================================
echo.

pause
