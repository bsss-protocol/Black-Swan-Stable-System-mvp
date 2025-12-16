import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 协议统计API
export const protocolAPI = {
  getStats: async () => {
    const response = await api.get('/api/stats');
    return response.data;
  },
  
  getPriceHistory: async (limit?: number) => {
    const response = await api.get('/api/prices/history', {
      params: { limit }
    });
    return response.data;
  },
  
  recordPrice: async (priceData: {
    ethPrice: number;
    defensePrice: number;
    blockNumber?: number;
  }) => {
    const response = await api.post('/api/prices', priceData);
    return response.data;
  },
  
  recordDeposit: async (depositData: {
    walletAddress: string;
    amount: number;
    txHash: string;
  }) => {
    const response = await api.post('/api/deposits', depositData);
    return response.data;
  },
  
  getUserInfo: async (address: string) => {
    const response = await api.get(`/api/users/${address}`);
    return response.data;
  }
};