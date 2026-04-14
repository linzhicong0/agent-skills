@echo off
REM Install mcp-kb-server globally on Windows
REM
REM   Usage:  install.bat
REM   After:  set KB_DIR=C:\path\to\kb && mcp-kb-server

cd /d "%~dp0"

echo Installing dependencies...
call npm install --production=false
if errorlevel 1 goto :error

echo Building...
call npm run build
if errorlevel 1 goto :error

echo Linking globally...
call npm link
if errorlevel 1 goto :error

echo.
echo Done! mcp-kb-server is now available globally.
echo Usage:  set KB_DIR=C:\path\to\your\kb ^&^& mcp-kb-server
echo.
echo To uninstall:  npm unlink -g mcp-kb-server
goto :eof

:error
echo.
echo Install failed with error code %errorlevel%.
exit /b %errorlevel%
