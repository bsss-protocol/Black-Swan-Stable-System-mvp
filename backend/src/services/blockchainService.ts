import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private bsssContract: ethers.Contract;
  private usdcContract: ethers.Contract;
  
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    
    // BSSS合约ABI（简化）
    const bsssABI = [
      "function getCurrentETHPrice() view returns (uint256)",
      "function getDefenseLinePrice() view returns (uint256)",
      "function getDefenseLineStatus() view returns (bool, bool, uint256, uint256, uint256)",
      "function getUserUSDCBalance(address) view returns (uint256)",
      "function getUserETHBalance(address) view returns (uint256)",
      "function getDepositorCount() view returns (uint256)",
      "event Deposited(address indexed user, uint256 amount, uint256 timestamp)",
      "event DefenseLineTriggered(uint256 defensePrice, uint256 currentPrice, uint256 timestamp)"
    ];
    
    // USDC合约ABI（简化）
    const usdcABI = [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)"
    ];
    
    const bsssAddress = process.env.BSSS_CONTRACT_ADDRESS!;
    const usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
    
    this.bsssContract = new ethers.Contract(bsssAddress, bsssABI, this.provider);
    this.usdcContract = new ethers.Contract(usdcAddress, usdcABI, this.provider);
  }
  
  // 获取ETH当前价格
  async getETHPrice(): Promise<number> {
    try {
      const price = await this.bsssContract.getCurrentETHPrice();
      return Number(ethers.formatUnits(price, 8)); // Chainlink返回8位小数
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      throw error;
    }
  }
  
  // 获取防御线价格
  async getDefenseLinePrice(): Promise<number> {
    try {
      const price = await this.bsssContract.getDefenseLinePrice();
      return Number(ethers.formatUnits(price, 8));
    } catch (error) {
      console.error('Error fetching defense line price:', error);
      throw error;
    }
  }
  
  // 获取防御线状态
  async getDefenseLineStatus() {
    try {
      const [isTriggered, isExecuted, defensePrice, triggerTime, executionTime] = 
        await this.bsssContract.getDefenseLineStatus();
      
      return {
        isTriggered,
        isExecuted,
        defensePrice: Number(ethers.formatUnits(defensePrice, 8)),
        triggerTime: Number(triggerTime),
        executionTime: Number(executionTime)
      };
    } catch (error) {
      console.error('Error fetching defense line status:', error);
      throw error;
    }
  }
  
  // 获取用户余额
  async getUserBalances(address: string) {
    try {
      const usdcBalance = await this.bsssContract.getUserUSDCBalance(address);
      const ethBalance = await this.bsssContract.getUserETHBalance(address);
      
      return {
        usdcBalance: Number(ethers.formatUnits(usdcBalance, 6)), // USDC有6位小数
        ethBalance: Number(ethers.formatUnits(ethBalance, 18))   // ETH有18位小数
      };
    } catch (error) {
      console.error('Error fetching user balances:', error);
      throw error;
    }
  }
  
  // 获取存款者数量
  async getDepositorCount(): Promise<number> {
    try {
      const count = await this.bsssContract.getDepositorCount();
      return Number(count);
    } catch (error) {
      console.error('Error fetching depositor count:', error);
      throw error;
    }
  }
  
  // 监听合约事件
  startEventListeners() {
    // 监听存款事件
    this.bsssContract.on("Deposited", async (user, amount, timestamp, event) => {
      console.log('New deposit detected:', {
        user,
        amount: ethers.formatUnits(amount, 6),
        timestamp: new Date(Number(timestamp) * 1000).toISOString(),
        txHash: event.log.transactionHash
      });
      
      // 这里可以触发后端处理逻辑
      // 比如更新数据库、发送通知等
    });
    
    // 监听防御线触发事件
    this.bsssContract.on("DefenseLineTriggered", (defensePrice, currentPrice, timestamp) => {
      console.log('Defense line triggered:', {
        defensePrice: ethers.formatUnits(defensePrice, 8),
        currentPrice: ethers.formatUnits(currentPrice, 8),
        timestamp: new Date(Number(timestamp) * 1000).toISOString()
      });
    });
    
    console.log('📡 Started listening to contract events');
  }
  
  // 停止监听
  stopEventListeners() {
    this.bsssContract.removeAllListeners();
    console.log('📡 Stopped listening to contract events');
  }
}