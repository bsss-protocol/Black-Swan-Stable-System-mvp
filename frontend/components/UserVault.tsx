'use client';

import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { CONTRACT_ADDRESSES, BSSS_ABI } from '@/constants/contracts';
import { formatUnits } from 'viem';

export default function UserVault() {
  const { address } = useAccount();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
  // 读取用户信息
  const { data: userUSDCBalance, refetch: refetchUSDC } = useReadContract({
    address: CONTRACT_ADDRESSES.BSSS_MVP,
    abi: BSSS_ABI,
    functionName: 'getUserUSDCBalance',
    args: [address],
    query: {
      enabled: !!address,
    },
  });
  
  const { data: userETHBalance, refetch: refetchETH } = useReadContract({
    address: CONTRACT_ADDRESSES.BSSS_MVP,
    abi: BSSS_ABI,
    functionName: 'getUserETHBalance',
    args: [address],
    query: {
      enabled: !!address,
    },
  });
  
  const { data: defenseLineStatus, refetch: refetchStatus } = useReadContract({
    address: CONTRACT_ADDRESSES.BSSS_MVP,
    abi: BSSS_ABI,
    functionName: 'getDefenseLineStatus',
  });
  
  const { writeContractAsync } = useWriteContract();

  // 自动刷新数据
  useEffect(() => {
    const interval = setInterval(() => {
      refetchUSDC();
      refetchETH();
      refetchStatus();
    }, 10000); // 每10秒刷新一次
    
    return () => clearInterval(interval);
  }, [refetchUSDC, refetchETH, refetchStatus]);

  const handleWithdraw = async () => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    const ethBalance = userETHBalance as bigint;
    if (!ethBalance || ethBalance <= 0) {
      alert('No ETH available to withdraw');
      return;
    }

    try {
      setIsWithdrawing(true);
      
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.BSSS_MVP,
        abi: BSSS_ABI,
        functionName: 'withdrawETH',
      });

      console.log('Withdraw transaction hash:', hash);
      alert('Withdrawal successful!');
      
      // 刷新余额
      refetchETH();
    } catch (error) {
      console.error('Withdraw error:', error);
      alert('Withdrawal failed. Please try again.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatBalance = (balance: bigint | undefined, decimals: number = 6) => {
    if (!balance) return '0.00';
    return parseFloat(formatUnits(balance, decimals)).toFixed(4);
  };

  const [isTriggered, isExecuted, defensePrice] = defenseLineStatus as [boolean, boolean, bigint] || [false, false, 0n];

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Your Vault</h2>
      
      <div className="space-y-6">
        {/* 状态指示器 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Defense Line Status</span>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                isTriggered 
                  ? isExecuted 
                    ? 'bg-green-500' 
                    : 'bg-yellow-500'
                  : 'bg-gray-300'
              }`}></div>
              <span className={`font-medium ${
                isTriggered 
                  ? isExecuted 
                    ? 'text-green-600' 
                    : 'text-yellow-600'
                  : 'text-gray-500'
              }`}>
                {isTriggered 
                  ? isExecuted 
                    ? 'Executed' 
                    : 'Triggered'
                  : 'Monitoring'
                }
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {isExecuted 
              ? 'Orders executed. You can withdraw your ETH.'
              : isTriggered
                ? 'Defense line triggered. Executing orders...'
                : 'Waiting for price to reach defense line.'
            }
          </div>
        </div>

        {/* 资产卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold">USDC</span>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Deposited</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatBalance(userUSDCBalance as bigint, 6)}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Available for defense line activation
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-600 font-bold">ETH</span>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Accumulated</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatBalance(userETHBalance as bigint, 18)}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              ETH purchased at defense line
            </p>
          </div>
        </div>

        {/* 提现按钮 */}
        <div>
          <button
            onClick={handleWithdraw}
            disabled={isWithdrawing || !userETHBalance || (userETHBalance as bigint) <= 0n}
            className={`w-full py-3 px-4 rounded-lg font-medium transition duration-200 ${
              isWithdrawing || !userETHBalance || (userETHBalance as bigint) <= 0n
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {isWithdrawing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              'Withdraw ETH'
            )}
          </button>
          
          <div className="mt-3 text-sm text-gray-500 text-center">
            Withdraw your ETH after defense line execution
          </div>
        </div>

        {/* 信息提示 */}
        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-yellow-800 font-medium">How it works</p>
              <p className="text-yellow-700 text-sm mt-1">
                When ETH price drops to defense line (80% of current), 
                your USDC is automatically used to buy ETH at a discount. 
                You can then withdraw the ETH.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}