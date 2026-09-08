@echo off
chcp 65001 >nul
cd /d "%~dp0"
title RustPilot — Сборка файлов релиза для GitHub
echo ========================================================
echo    TRP Labs RustPilot — Подготовка релиза для GitHub
echo ========================================================
echo.
call npm.cmd run release:pack
echo.
if exist "release\github-ready" (
    echo Открытие папки с готовыми файлами релиза...
    explorer.exe "%~dp0release\github-ready"
)
pause
