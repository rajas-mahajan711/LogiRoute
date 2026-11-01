@echo off
title LogiRoute AI Launcher
echo =======================================================================
echo     LogiRoute AI: Warehouse Path Planner (C++ DSA + React)
echo =======================================================================
echo.

:: 1. Check & Install Backend Dependencies
if not exist "backend\node_modules\" (
    echo [Setup] Installing backend dependencies...
    cd backend && call npm install && cd ..
)

:: 2. Check & Install Frontend Dependencies
if not exist "frontend\node_modules\" (
    echo [Setup] Installing frontend dependencies...
    cd frontend && call npm install && cd ..
)

:: 3. Build C++ Engine if not already compiled
if not exist "cpp-engine\routing_engine.exe" (
    echo [Engine] Compiling C++ DSA Routing Engine...
    cd cpp-engine
    where g++ >nul 2>nul
    if %errorlevel% equ 0 (
        g++ -O3 -std=c++14 routing_engine.cpp -o routing_engine.exe
    )
    cd ..
)

if exist "cpp-engine\routing_engine.exe" (
    echo [Engine] C++ native engine is ready.
) else (
    echo [Engine] C++ compiler not detected. Coordinator will use JavaScript fallback.
)
echo.

:: 4. Start Backend
echo [1/2] Starting Express Coordinator Backend on Port 5000...
start "LogiRoute Backend (Port 5000)" cmd /k "cd backend && npm start"
echo Backend started in separate window.
echo.

:: 5. Start Frontend
echo [2/2] Starting React Vite Frontend on Port 5173...
start "LogiRoute Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"
echo Frontend started in separate window.
echo.

:: 6. Open Browser
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo =======================================================================
echo  LogiRoute AI is active!
echo  Frontend Dashboard: http://localhost:5173
echo  Backend Coordinator: http://localhost:5000/api/health
echo =======================================================================
