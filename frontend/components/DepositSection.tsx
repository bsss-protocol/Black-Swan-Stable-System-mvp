'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES, BSSS_ABI } from '@/constants/contracts';
import { parseUnits } from 'viem';

export default function DepositSection() {
  const { address } = useAccount();
  const [amount, setAmount] = useState<string>('');
  const [isDepositing, setIsDepositing] = useState(false);

  // 读取用户当前USDC余额
  const { data: userUSDCBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.BSSS_MVP,
    abi: BSSS_ABI,
    functionName: 'getUserUSDCBalance',
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  // 存款函数调用
  const { writeContractAsync } = useWriteContract();

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setIsDepositing(true);
      
      // 将金额转换为6位小数（USDC标准）
      const amountInWei = parseUnits(amount, 6);
      
      // 调用存款函数
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.BSSS_MVP,
        abi: BSSS_ABI,
        functionName: 'depositUSDC',
        args: [amountInWei],
      });

      console.log('Deposit transaction hash:', hash);
      alert('Deposit successful!');
      
      // 重置输入框
      setAmount('');
      
      // 刷新余额
      refetchBalance();
    } catch (error) {
      console.error('Deposit error:', error);
      alert('Deposit failed. Please check your balance and try again.');
    } finally {
      setIsDepositing(false);
    }
  };

  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return '0.00';
    return (Number(balance) / 1_000_000).toFixed(2); // USDC有6位小数
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Deposit USDC</h2>
      
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Your Vault Balance</span>
            <span className="font-bold text-gray-800">
              {formatBalance(userUSDCBalance as bigint)} USDC
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Deposited USDC will be used to buy ETH when defense line is triggered
          </div>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">
            Amount to Deposit (USDC)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter USDC amount"
              className="w-full p-3 pl-4 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              min="0"
              step="0.01"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <span className="text-gray-500 font-medium">USDC</span>
            </div>
          </div>
          
          <div className="flex space-x-2 mt-3">
            {[10, 50, 100, 500].map((value) => (
              <button
                key={value}
                onClick={() => setAmount(value.toString())}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
              >
                ${value}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleDeposit}
            disabled={isDepositing || !amount || parseFloat(amount) <= 0}
            className={`w-full py-3 px-4 rounded-lg font-medium transition duration-200 ${
              isDepositing || !amount || parseFloat(amount) <= 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isDepositing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              'Deposit USDC'
            )}
          </button>
          
          <div className="text-sm text-gray-500 text-center">
            Deposits are secured by smart contracts on Sepolia testnet
          </div>
        </div>
      </div>
    </div>
  );
}