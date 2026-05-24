@echo off
title 经侦大队工作记录管理系统
chcp 65001 >nul

:: 查找 Chrome
set "CHROME="
for %%p in (
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
  "%UserProfile%\AppData\Local\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles%\Google\Chrome Beta\Application\chrome.exe"
) do (
  if exist "%%~p" set "CHROME=%%~p" & goto found
)

:: 查找 Edge（Chrome 内核）
for %%p in (
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) do (
  if exist "%%~p" set "CHROME=%%~p" & goto found
)

:: 查找 360 极速等 Chromium 内核浏览器
for %%p in (
  "%ProgramFiles(x86)%\360\Chrome\Application\360chrome.exe"
  "%ProgramFiles%\360\Chrome\Application\360chrome.exe"
) do (
  if exist "%%~p" set "CHROME=%%~p" & goto found
)

:found
if "%CHROME%"=="" (
  echo.
  echo [错误] 未找到 Chrome 或 Edge 浏览器
  echo 请安装 Chrome 后重试：https://www.google.cn/chrome/
  echo.
  pause
  exit /b 1
)

echo.
echo  经侦大队工作记录管理系统
echo  正在启动桌面模式...
echo.
start "" "%CHROME%" --new-window --app="%~dp0dist\index.html"
exit
