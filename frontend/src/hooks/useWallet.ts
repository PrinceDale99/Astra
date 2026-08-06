'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  isConnected as freighterIsConnected,
  requestAccess,
  getAddress as freighterGetAddress,
} from '@stellar/freighter-api';

// ─── Types ───────────────────────────────────────────────────────────────────

export type WalletType = 'freighter' | 'walletconnect' | null;

export interface WalletHookResult {
  connected: boolean;
  publicKey: string | null;
  xlmBalance: string;
  walletType: WalletType;
  error: string | null;
  loading: boolean;
  showSelector: boolean;
  openSelector: () => void;
  closeSelector: () => void;
  connectFreighter: () => Promise<string | null>;
  connectWalletConnect: () => Promise<string | null>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

const HORIZON_URL = 'https://horizon-testnet.stellar.org';

// ─── Balance helper ──────────────────────────────────────────────────────────

async function fetchXlmBalance(publicKey: string): Promise<string> {
  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
    if (!res.ok) return '0.00';
    const data = await res.json();
    const native = data.balances?.find((b: any) => b.asset_type === 'native');
    return native ? parseFloat(native.balance).toFixed(2) : '0.00';
  } catch {
    return '0.00';
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export default function useWallet(): WalletHookResult {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [xlmBalance, setXlmBalance] = useState('0.00');
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  // ── Balance polling ──────────────────────────────────────────────────────
  const refreshBalance = useCallback(async () => {
    if (!publicKey) return;
    const bal = await fetchXlmBalance(publicKey);
    setXlmBalance(bal);
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey) return;
    refreshBalance();
    const id = setInterval(refreshBalance, 12000);
    return () => clearInterval(id);
  }, [publicKey, refreshBalance]);

  // ── Freighter ────────────────────────────────────────────────────────────
  const connectFreighter = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const check = await freighterIsConnected();
      if (!check.isConnected) {
        throw new Error(
          'Freighter extension not installed. Get it at freighter.app then refresh.'
        );
      }

      const access = await requestAccess();
      if (access.error) throw new Error(`Access denied: ${access.error}`);

      const addr = await freighterGetAddress();
      if (addr.error || !addr.address) {
        throw new Error('Could not retrieve public key from Freighter.');
      }

      setPublicKey(addr.address);
      setConnected(true);
      setWalletType('freighter');
      setShowSelector(false);
      return addr.address;
    } catch (err: any) {
      setError(err.message || 'Freighter connection failed.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── WalletConnect (stellar-wallets-kit v2 static API) ────────────────────
  const connectWalletConnect = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      // Dynamically import to avoid SSR / tree-shaking issues
      const { StellarWalletsKit } = await import('@creit.tech/stellar-wallets-kit');

      // Initialise the kit with all available wallet modules
      // (includes WalletConnect, Freighter, Ledger, etc.)
      StellarWalletsKit.init({
        // @ts-ignore — network type varies across package versions
        network: 'TESTNET',
        modules: [], // empty = auto-detect supported modules
      });

      // Open the built-in wallet selector modal
      await StellarWalletsKit.authModal({});

      // After the user selects a wallet and connects, fetch the address
      const { address } = await StellarWalletsKit.getAddress();
      if (!address) throw new Error('No address returned. Did you complete the connection?');

      setPublicKey(address);
      setConnected(true);
      setWalletType('walletconnect');
      setShowSelector(false);
      return address;
    } catch (err: any) {
      // User deliberately closed the modal — not a real error
      const msg: string = err?.message ?? '';
      if (
        msg.includes('closed') ||
        msg.includes('rejected') ||
        msg.includes('cancel')
      ) {
        // swallow silently
        return null;
      }
      setError(msg || 'WalletConnect connection failed.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Disconnect ───────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    try {
      const { StellarWalletsKit } = await import('@creit.tech/stellar-wallets-kit');
      StellarWalletsKit.disconnect();
    } catch {
      // ignore if not connected via kit
    }
    setConnected(false);
    setPublicKey(null);
    setWalletType(null);
    setXlmBalance('0.00');
    setError(null);
  }, []);

  return {
    connected,
    publicKey,
    xlmBalance,
    walletType,
    error,
    loading,
    showSelector,
    openSelector: () => { setShowSelector(true); setError(null); },
    closeSelector: () => setShowSelector(false),
    connectFreighter,
    connectWalletConnect,
    disconnect,
    refreshBalance,
  };
}
