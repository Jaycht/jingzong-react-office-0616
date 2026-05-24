@echo off
chcp 65001 >nul
title 经侦大队工作记录管理系统
set DIST=%~dp0dist\index.html
if not exist "%DIST%" (
    echo [错误] 未找到 dist\index.html，请先构建
    pause
    exit /b 1
)
set CHROME=
for %%b in (
    "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    "%LocalAppData%\Google\Chrome\Application\chrome.exe"
    "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) do if exist "%%~b" set CHROME=%%~b
if not defined CHROME (
    echo [错误] 未找到 Chrome 或 Edge，请安装后重试
    pause
    exit /b 1
)
start "" "%CHROME%" --new-window --app="%DIST%" --no-default-browser-check --disable-extensions
exit
