'use client';

import { useAccount } from 'wagmi';
import ConnectWallet from '@/components/ConnectWallet';
import PriceDisplay from '@/components/PriceDisplay';
import DepositSection from '@/components/DepositSection';
import UserVault from '@/components/UserVault';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 导航栏 */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg"></div>
              <span className="text-xl font-bold text-gray-800">BSSS</span>
              <span className="text-sm text-gray-500 hidden md:inline">Black Swan Stable System</span>
            </div>
            <ConnectWallet />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部信息 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Market Stability Protocol
          </h1>
          <p className="text-gray-600">
            Protect against extreme volatility by participating in decentralized stability lines
          </p>
        </div>

        {!isConnected ? (
          <div className="bg-white rounded-xl p-8 shadow-lg text-center border border-gray-200">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Connect your wallet to start using BSSS. Deposit USDC to participate in stability mining and earn ETH when defense lines are triggered.
            </p>
            <div className="inline-block">
              <ConnectWallet />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左侧列 - 价格信息 */}
            <div className="lg:col-span-1">
              <PriceDisplay />
              <div className="mt-8">
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-3">Network Info</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Network</span>
                      <span className="font-medium">Sepolia Testnet</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      <span className="font-medium text-green-600">Connected</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Contract Version</span>
                      <span className="font-medium">MVP 1.0</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧列 - 交互面板 */}
            <div className="lg:col-span-2 space-y-8">
              <DepositSection />
              <UserVault />
              
              {/* 统计数据 */}
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white">
                <h3 className="text-lg font-bold mb-4">Protocol Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-gray-300 text-sm">Total Deposited</p>
                    <p className="text-2xl font-bold">$1.2M</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-300 text-sm">ETH Protected</p>
                    <p className="text-2xl font-bold">850 ETH</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-300 text-sm">Active Users</p>
                    <p className="text-2xl font-bold">1,245</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-300 text-sm">Success Rate</p>
                    <p className="text-2xl font-bold">98.7%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 页脚信息 */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center text-gray-500 text-sm">
            <p className="mb-2">BSSS - Black Swan Stable System | Sepolia Testnet Deployment</p>
            <p>This is a demonstration interface. All transactions are on testnet.</p>
            <p className="mt-4">
              Contract Address: <span className="font-mono text-gray-700">{CONTRACT_ADDRESSES.BSSS_MVP}</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}