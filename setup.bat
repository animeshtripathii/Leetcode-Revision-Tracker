@echo off
echo =================================
echo LeetTrack - Quick Setup Script
echo =================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js v16 or higher.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js version:
node --version
echo.

REM Backend setup
echo [SETUP] Setting up backend...
cd server
call npm install
echo [OK] Backend dependencies installed
echo.

REM Check if .env exists
if not exist .env (
    echo [INFO] Creating .env file...
    copy .env.example .env
    echo [WARNING] IMPORTANT: Edit server\.env with your MongoDB URI and email credentials!
    echo.
)

cd ..

REM Frontend setup
echo [SETUP] Setting up frontend...
cd client
call npm install
echo [OK] Frontend dependencies installed
echo.

cd ..

echo [SUCCESS] Setup complete!
echo.
echo Next steps:
echo 1. Edit server\.env with your configuration
echo 2. Make sure MongoDB is running
echo 3. In one terminal: cd server ^&^& npm run dev
echo 4. In another terminal: cd client ^&^& npm run dev
echo 5. Open http://localhost:3000 in your browser
echo.
echo For detailed instructions, see README.md
echo.
pause
