@echo off
title 经侦大队工作记录管理系统 - 桌面端
echo ============================================
echo  经侦大队工作记录管理系统
echo  正在启动桌面应用...
echo ============================================
echo.
cd /d "%~dp0"
start "" "%~dp0node_modules\.bin\electron.cmd" "%~dp0"
exit
