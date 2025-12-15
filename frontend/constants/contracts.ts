// Sepolia 测试网合约地址
export const CONTRACT_ADDRESSES = {
  BSSS_MVP: '0xYourBSSSContractAddress', // 替换为实际部署的BSSS合约地址
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
  CHAINLINK_ETH_USD: '0x694AA1769357215DE4FAC081bf1f309aDC325306', // Sepolia Chainlink ETH/USD
};

// BSSS 合约 ABI (简化版本)
export const BSSS_ABI = [
  {
    name: 'depositUSDC',
    type: 'function',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'getDefenseLinePrice',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'withdrawETH',
    type: 'function',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'getCurrentETHPrice',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'getUserUSDCBalance',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'getUserETHBalance',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'getDefenseLineStatus',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'isTriggered', type: 'bool' },
      { name: 'isExecuted', type: 'bool' },
      { name: 'defensePrice', type: 'uint256' },
      { name: 'triggerTime', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
];

// Chainlink 预言机 ABI
export const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
];