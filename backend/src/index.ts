import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

// 加载环境变量
dotenv.config();

// 初始化应用
const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 初始化以太坊提供者
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 获取协议统计信息
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await prisma.protocolStats.findFirst({
      orderBy: { updatedAt: 'desc' }
    });
    
    // 从链上获取实时数据
    const totalDeposits = stats?.totalDeposited || 0;
    const activeUsers = await prisma.user.count();
    
    res.json({
      totalDeposited: totalDeposits,
      totalWithdrawn: stats?.totalWithdrawn || 0,
      activeUsers,
      defenseTriggers: stats?.defenseTriggers || 0,
      updatedAt: stats?.updatedAt || new Date()
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// 获取价格历史
app.get('/api/prices/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    
    const prices = await prisma.priceHistory.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' }
    });
    
    res.json(prices);
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

// 获取用户信息
app.get('/api/users/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { walletAddress: address.toLowerCase() },
      include: {
        deposits: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        withdrawals: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user information' });
  }
});

// 记录用户存款
app.post('/api/deposits', async (req, res) => {
  try {
    const { walletAddress, amount, txHash } = req.body;
    
    if (!walletAddress || !amount || !txHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // 检查用户是否存在
    let user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() }
    });
    
    // 如果用户不存在，创建新用户
    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress: walletAddress.toLowerCase() }
      });
    }
    
    // 记录存款
    const deposit = await prisma.deposit.create({
      data: {
        userId: user.id,
        amount,
        txHash
      }
    });
    
    // 更新协议统计
    await prisma.protocolStats.upsert({
      where: { id: 1 },
      update: {
        totalDeposited: { increment: amount }
      },
      create: {
        id: 1,
        totalDeposited: amount
      }
    });
    
    res.status(201).json(deposit);
  } catch (error) {
    console.error('Error recording deposit:', error);
    res.status(500).json({ error: 'Failed to record deposit' });
  }
});

// 记录价格更新
app.post('/api/prices', async (req, res) => {
  try {
    const { ethPrice, defensePrice, blockNumber } = req.body;
    
    if (!ethPrice || !defensePrice) {
      return res.status(400).json({ error: 'Missing price data' });
    }
    
    const priceRecord = await prisma.priceHistory.create({
      data: {
        ethPrice,
        defensePrice,
        blockNumber
      }
    });
    
    res.status(201).json(priceRecord);
  } catch (error) {
    console.error('Error recording price:', error);
    res.status(500).json({ error: 'Failed to record price' });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`🚀 Backend server running on http://localhost:${port}`);
  console.log(`📊 API Documentation: http://localhost:${port}/api/health`);
});

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});