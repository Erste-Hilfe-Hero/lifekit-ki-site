@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 ( echo Node.js ab 22.16.0 wird benoetigt. & pause & exit /b 1 )
node tools\launch.mjs --no-build --no-browser %*
if errorlevel 1 pause
