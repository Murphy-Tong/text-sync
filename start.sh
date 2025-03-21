#!/bin/bash

# 获取脚本所在目录的绝对路径
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 定义颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 启动后端
echo -e "${BLUE}启动后端服务...${NC}"
cd "$DIR/backend"
yarn install
yarn dev &

# 等待后端启动
sleep 2

# 启动前端
echo -e "${BLUE}启动前端服务...${NC}"
cd "$DIR/frontend"
yarn install
yarn dev &

# 等待服务启动
sleep 2

# 显示访问地址
echo -e "${GREEN}服务已启动!${NC}"
echo -e "${GREEN}前端访问地址: http://localhost:5173${NC}"
echo -e "${GREEN}后端访问地址: http://localhost:3000${NC}"
echo -e "${BLUE}按 Ctrl+C 停止所有服务${NC}"

# 等待用户中断
wait 