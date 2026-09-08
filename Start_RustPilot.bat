@echo off
title RustPilot Launcher
set "RP_DIR=%~dp0release\win-unpacked"
if not exist "%RP_DIR%\RustPilot.exe" (
    set "RP_DIR=Z:\ai\apps\RustPilot\release\win-unpacked"
)
cd /d "%RP_DIR%"
start "" "RustPilot.exe"
exit
