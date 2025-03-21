@echo off
setlocal

rem 设置标题
title 实时同步应用启动脚本

rem 设置颜色
color 0A

echo 启动后端服务...
cd backend
call yarn install
start cmd /k "title 后端服务 && color 0B && yarn dev"

rem 等待后端启动
timeout /t 2 /nobreak > nul

echo 启动前端服务...
cd ../frontend
call yarn install
start cmd /k "title 前端服务 && color 0E && yarn dev"

rem 等待前端启动
timeout /t 2 /nobreak > nul

echo.
echo 服务已启动!
echo 前端访问地址: http://localhost:5173
echo 后端访问地址: http://localhost:3000
echo 请不要关闭命令行窗口!
echo.

rem 保持窗口打开
pause 