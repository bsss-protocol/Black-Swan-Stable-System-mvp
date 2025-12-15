'use client';

import { useEffect, useState } from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES, BSSS_ABI, CHAINLINK_ABI } from '@/constants/contracts';
import { formatUnits } from 'viem';

export default function PriceDisplay() {
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [defensePrice, setDefensePrice] = useState<number>(0);
  const [priceDiff, setPriceDiff] = useState<number>(0);

  // 读取当前ETH价格
  const { data: chainlinkData } = useReadContract({
    address: CONTRACT_ADDRESSES.CHAINLINK_ETH_USD,
    abi: CHAINLINK_ABI,
    functionName: 'latestRoundData',
  });

  // 读取防御线价格
  const { data: defenseLinePrice } = useReadContract({
    address: CONTRACT_ADDRESSES.BSSS_MVP,
    abi: BSSS_ABI,
    functionName: 'getDefenseLinePrice',
  });

  useEffect(() => {
    if (chainlinkData) {
      const [, answer] = chainlinkData as [bigint, bigint, bigint, bigint, bigint];
      const price = parseFloat(formatUnits(answer, 8)); // Chainlink 返回8位小数
      setCurrentPrice(price);
    }
  }, [chainlinkData]);

  useEffect(() => {
    if (defenseLinePrice) {
      const price = parseFloat(formatUnits(defenseLinePrice as bigint, 8));
      setDefensePrice(price);
      
      // 计算价格差异百分比
      if (currentPrice > 0) {
        const diff = ((currentPrice - price) / currentPrice) * 100;
        setPriceDiff(diff);
      }
    }
  }, [defenseLinePrice, currentPrice]);

  const getStatusColor = () => {
    if (priceDiff > 10) return 'text-green-500';
    if (priceDiff > 5) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white shadow-lg">
      <h2 className="text-xl font-bold mb-4">Market Prices</h2>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-300">Current ETH Price</p>
            <p className="text-3xl font-bold">${currentPrice.toFixed(2)}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-300">Defense Line Price</p>
              <p className="text-2xl font-bold">${defensePrice.toFixed(2)}</p>
              <p className={`text-sm ${getStatusColor()}`}>
                {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)}% above current
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <p className="text-sm">
              Defense line triggers at <span className="font-bold">80%</span> of current price
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}