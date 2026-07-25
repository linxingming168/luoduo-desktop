@echo off
chcp 65001 >nul
title 落朵大脑 · AI军团

echo ========================================
echo   落朵大脑 · AI军团 桌面客户端
echo   首次启动需安装依赖（约1-3分钟）
echo ========================================
echo.
echo 🔍 检查 Node.js...

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 未检测到 Node.js
    echo    请从以下链接下载安装：
    echo    https://nodejs.org
    echo.
    echo    安装后重新双击本文件。
    echo.
    pause
    exit /b 1
)
echo ✅ Node.js 已安装
echo.

if not exist "node_modules\" (
    echo 📦 正在安装依赖（首次需要，约1-3分钟）...
    echo    请稍候，不要关闭此窗口...
    echo.
    call npm install --registry=https://registry.npmmirror.com
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ 依赖安装失败
        echo    可能是网络问题，重新双击本文件重试
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
) else (
    echo ✅ 依赖已安装
)

echo.
echo 🚀 正在启动 AI军团...
echo.
echo ⚠️ 如果弹出"Windows Defender 防火墙"提示
echo    请勾选"专用网络"后点击"允许访问"
echo.
echo 🖥️  AI军团窗口即将弹出...
echo.
start /wait cmd /c "npm run start"

echo.
echo ⚠️ AI军团已关闭
pause
