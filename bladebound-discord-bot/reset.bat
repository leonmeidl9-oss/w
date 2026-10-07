@echo off
chcp 65001 >nul
title Bladebound Discord-Bot - RESET
cd /d "%~dp0"

where node >/dev/null 2>nul
if errorlevel 1 (
  echo [FEHLER] Node.js ist nicht installiert.
  echo Lade die LTS-Version hier herunter: https://nodejs.org
  echo Danach start.bat nochmal starten.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installiere Pakete - nur beim ersten Start ...
  call npm install
  if errorlevel 1 (
    echo [FEHLER] Die Installation hat nicht geklappt.
    pause
    exit /b 1
  )
)

node index.js --reset
echo.
echo Der Bot wurde beendet.
pause
