@echo off
title Casinova Advanced Game Bot Launcher (Watchdog + CAPTCHA)
color 0A
cd /d "%~dp0"

echo =======================================================
echo    CASINOVA ADVANCED GAME BOT WORKER LAUNCHER
echo    One Chrome + auto CAPTCHA + session re-login
echo =======================================================
echo.
echo [1/5] Checking Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH!
    pause
    exit /b 1
)

echo [2/5] Syncing workers\.env into all 8 bot folders...
node sync-bot-env.mjs
if errorlevel 1 (
    echo [ERROR] sync-bot-env.mjs failed — check workers\.env exists.
    pause
    exit /b 1
)

echo [3/5] Launching ONE Chrome with all 8 panel tabs (port 9222)...
call "%~dp0start-unified-chrome.bat" nopause
if errorlevel 1 (
    echo [ERROR] Unified Chrome failed. Close other Chrome on 9222 and retry.
    pause
    exit /b 1
)

curl.exe -s -o nul -w "%%{http_code}" http://127.0.0.1:9222/json/version 2>nul | findstr /r "^200$" >nul
if errorlevel 1 (
  echo [ERROR] Chrome CDP on 9222 is not up.
  pause
  exit /b 1
)

echo [4/5] Smoke check (env, passwords, tabs)...
node scripts\smoke-check.mjs
if errorlevel 1 (
  echo [ERROR] Smoke check failed — fix issues above before starting bots.
  pause
  exit /b 1
)

echo      Chrome ready. Bots login one-at-a-time (login lock) + auto CAPTCHA.
echo      Keep that Chrome window open.
echo.
echo [5/5] Launching Bot Watchdog...
echo.
node bot-watchdog.mjs

pause
