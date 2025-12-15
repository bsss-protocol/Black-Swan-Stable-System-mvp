'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showDisconnect, setShowDisconnect] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <div className="space-x-2">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200"
          >
            Connect Wallet
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDisconnect(!showDisconnect)}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200 flex items-center space-x-2"
      >
        <div className="w-2 h-2 bg-green-300 rounded-full"></div>
        <span>{formatAddress(address || '')}</span>
      </button>

      {showDisconnect && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <button
            onClick={() => {
              disconnect();
              setShowDisconnect(false);
            }}
            className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition duration-150"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}