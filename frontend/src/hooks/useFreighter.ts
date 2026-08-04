'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  isConnected,
  requestAccess,
  getAddress,
} from '@stellar/freighter-api';

interface FreighterHookResult {
  connected: boolean;
  publicKey: string | null;
  xlmBalance: string;
  error: string | null;
  loading: boolean;
  connectWallet: () => Promise<string | null>;
  refreshBalance: () => Promise<void>;
}

export default function useFreighter(): FreighterHookResult {
  const [connected, setConnected] = useState<boolean>(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [xlmBalance, setXlmBalance] = useState<string>('0.00');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Poll / fetch balance from Stellar Testnet Horizon RPC
  const refreshBalance = useCallback(async () => {
    if (!publicKey) return;
    try {
      const response = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${publicKey}`
      );
      if (!response.ok) {
        throw new Error('Account not found or inactive on Testnet. Mint via Friendbot first.');
      }
      const data = await response.json();
      const nativeBalance = data.balances.find(
        (b: { asset_type: string }) => b.asset_type === 'native'
      );
      if (nativeBalance) {
        setXlmBalance(parseFloat(nativeBalance.balance).toFixed(2));
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error fetching XLM balance.');
      }
    }
  }, [publicKey]);

  // Connect wallet
  const connectWallet = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const connectionResult = await isConnected();
      if (!connectionResult.isConnected) {
        throw new Error('Freighter extension not found. Please install it.');
      }

      // Request authorization / permissions
      const accessResult = await requestAccess();
      if (accessResult.error) {
        throw new Error(`Wallet access denied: ${accessResult.error}`);
      }

      const addressResult = await getAddress();
      if (addressResult.error || !addressResult.address) {
        throw new Error(`Could not fetch active public key: ${addressResult.error}`);
      }

      setPublicKey(addressResult.address);
      setConnected(true);
      return addressResult.address;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('User connection failed.');
      }
      setConnected(false);
      setPublicKey(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll balance on state changes
  useEffect(() => {
    if (publicKey) {
      refreshBalance();
      const interval = setInterval(refreshBalance, 10000);
      return () => clearInterval(interval);
    }
  }, [publicKey, refreshBalance]);

  return {
    connected,
    publicKey,
    xlmBalance,
    error,
    loading,
    connectWallet,
    refreshBalance,
  };
}
