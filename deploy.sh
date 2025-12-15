#!/bin/bash

# BSSS项目一键部署脚本
set -e

echo "🚀 开始部署BSSS项目..."

# 检查环境
command -v node >/dev/null 2>&1 || { echo "❌ 请先安装Node.js"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ 请先安装Docker"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ 请先安装Docker Compose"; exit 1; }

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：打印步骤
step() {
    echo -e "\n${YELLOW}▶ $1${NC}"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

# 步骤1：部署智能合约
step "1. 部署智能合约到Sepolia测试网"
cd contracts

if [ ! -f .env ]; then
    echo "请配置合约环境变量..."
    read -p "请输入Sepolia RPC URL: " sepolia_rpc
    read -p "请输入部署者私钥: " private_key
    read -p "请输入Etherscan API密钥: " etherscan_key
    
    cat > .env << EOF
SEPOLIA_RPC_URL=$sepolia_rpc
PRIVATE_KEY=$private_key
ETHERSCAN_API_KEY=$etherscan_key
EOF
    success "环境变量配置完成"
fi

# 安装依赖
npm ci || error "合约依赖安装失败"

# 运行测试
npm test || error "合约测试失败"

# 部署合约
npx hardhat run scripts/deploy.js --network sepolia || error "合约部署失败"

# 获取合约地址
CONTRACT_ADDRESS=$(cat deployments/sepolia.json | jq -r '.contracts.BSSSMVP')
success "合约部署成功: $CONTRACT_ADDRESS"

cd ..

# 步骤2：启动后端和数据库
step "2. 启动后端服务和数据库"
cd backend

# 配置后端环境
if [ ! -f .env ]; then
    cat > .env << EOF
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/bsss_db
SEPOLIA_RPC_URL=$sepolia_rpc
BSSS_CONTRACT_ADDRESS=$CONTRACT_ADDRESS
JWT_SECRET=$(openssl rand -hex 32)
EOF
fi

# 安装依赖
npm ci || error "后端依赖安装失败"

# 启动数据库迁移
npx prisma migrate dev --name init || error "数据库迁移失败"

# 生成Prisma客户端
npx prisma generate || success "Prisma客户端生成成功"

cd ..

# 步骤3：配置前端
step "3. 配置前端应用"
cd frontend

# 配置前端环境
if [ ! -f .env.local ]; then
    cat > .env.local << EOF
NEXT_PUBLIC_SEPOLIA_RPC_URL=$sepolia_rpc
NEXT_PUBLIC_BSSS_CONTRACT_ADDRESS=$CONTRACT_ADDRESS
NEXT_PUBLIC_CHAINLINK_ORACLE=0x694AA1769357215DE4FAC081bf1f309aDC325306
NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
fi

# 安装依赖
npm ci || error "前端依赖安装失败"

cd ..

# 步骤4：使用Docker启动所有服务
step "4. 使用Docker Compose启动所有服务"

# 设置环境变量
export SEPOLIA_RPC_URL=$sepolia_rpc
export BSSS_CONTRACT_ADDRESS=$CONTRACT_ADDRESS

# 启动Docker容器
docker-compose up -d || error "Docker Compose启动失败"

# 等待服务启动
echo "等待服务启动..."
sleep 10

# 检查服务状态
if docker-compose ps | grep -q "Up"; then
    success "所有服务启动成功！"
else
    error "服务启动失败，请检查日志"
fi

# 步骤5：显示部署信息
step "5. 部署完成！"

echo -e "\n${GREEN}🎉 BSSS项目部署成功！${NC}"
echo "=========================================="
echo "🌐 前端应用: http://localhost:3000"
echo "🔧 后端API: http://localhost:3001"
echo "🗄️  数据库管理: http://localhost:5050"
echo "📊 合约地址: $CONTRACT_ADDRESS"
echo "=========================================="
echo ""
echo "📋 测试账户信息："
echo "   邮箱: admin@bsss.com"
echo "   密码: admin"
echo ""
echo "🚀 开始使用BSSS协议吧！"