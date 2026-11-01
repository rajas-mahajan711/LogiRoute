@echo off
echo Building LogiRoute C++ Routing Engine...
g++ -O3 -std=c++14 routing_engine.cpp -o routing_engine.exe
if %ERRORLEVEL% EQU 0 (
    echo Build successful: routing_engine.exe created.
) else (
    echo Build failed with error %ERRORLEVEL%
)
