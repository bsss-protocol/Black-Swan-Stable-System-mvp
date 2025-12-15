#!/bin/bash

# 本地开发环境启动脚本

echo "🚀 启动BSSS本地开发环境..."

# 启动本地以太坊节点
cd contracts
echo "启动Hardhat本地节点..."
npx hardhat node &

# 等待节点启动
sleep 5

echo "部署合约到本地网络..."
npx hardhat run scripts/deploy.js --network localhost

# 启动后端
cd ../backend
echo "启动后端服务..."
npm run dev &

# 启动前端
cd ../frontend
echo "启动前端应用..."
npm run dev

# 保持脚本运行
wait