@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -File "%~dp0gradlew.ps1" %*
exit /b %ERRORLEVEL%
