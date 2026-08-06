'use client';

import React, { useEffect, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';

interface WalletOption {
  id: 'freighter' | 'walletconnect';
  name: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
}

interface WalletSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (wallet: 'freighter' | 'walletconnect') => void;
  isConnecting: boolean;
  connectingWallet: 'freighter' | 'walletconnect' | null;
  error: string | null;
}

const FreighterIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
    <rect width="40" height="40" rx="8" fill="#7B3FE4" />
    <path d="M10 20 L20 10 L30 20 L20 30 Z" fill="white" opacity="0.9" />
    <path d="M15 20 L20 15 L25 20 L20 25 Z" fill="#7B3FE4" />
  </svg>
);

const WalletConnectIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
    <rect width="40" height="40" rx="8" fill="#3B99FC" />
    <path
      d="M13.5 16.5C17.1 12.9 22.9 12.9 26.5 16.5L27.2 17.2C27.4 17.4 27.4 17.7 27.2 17.9L25.5 19.6C25.4 19.7 25.2 19.7 25.1 19.6L24.1 18.6C21.8 16.3 18.2 16.3 15.9 18.6L14.8 19.7C14.7 19.8 14.5 19.8 14.4 19.7L12.7 18C12.5 17.8 12.5 17.5 12.7 17.3L13.5 16.5Z"
      fill="white"
    />
    <path
      d="M28.5 18.5L30 20L26.5 23.5L23 20L24.5 18.5C25.3 17.7 26.7 17.7 27.5 18.5L28.5 18.5Z"
      fill="white"
    />
    <path
      d="M17 20L18.5 21.5L20 20L21.5 21.5L20 23L16.5 19.5L18 18C18.8 17.2 20.2 17.2 21 18L22.5 19.5L21 21L19.5 19.5L18 21L16.5 19.5L18 18"
      fill="white"
    />
  </svg>
);

export default function WalletSelectorModal({
  isOpen,
  onClose,
  onSelect,
  isConnecting,
  connectingWallet,
  error,
}: WalletSelectorModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const wallets: WalletOption[] = [
    {
      id: 'freighter',
      name: 'Freighter',
      description: 'Browser extension wallet by Stellar Development Foundation',
      icon: <FreighterIcon />,
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      description: 'Connect any mobile or desktop wallet via QR code',
      icon: <WalletConnectIcon />,
      badge: 'Mobile friendly',
    },
  ];

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm border border-[#1A2035] bg-[#080c14] overflow-hidden"
        style={{ boxShadow: '0 0 60px rgba(0,255,204,0.08), 0 0 0 1px rgba(0,255,204,0.05)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1A2035]">
          <div>
            <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white">
              Connect Wallet
            </h2>
            <p className="mt-1 text-[10px] font-mono text-zinc-500 tracking-wider">
              Select how you want to connect
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isConnecting}
            className="text-zinc-500 hover:text-white transition-colors p-1 disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wallet Options */}
        <div className="p-4 space-y-3">
          {wallets.map((wallet) => {
            const isThisConnecting = isConnecting && connectingWallet === wallet.id;
            return (
              <button
                key={wallet.id}
                onClick={() => !isConnecting && onSelect(wallet.id)}
                disabled={isConnecting}
                className={`w-full flex items-center gap-4 p-4 border text-left transition-all duration-200 group
                  ${isThisConnecting
                    ? 'border-[#00ffcc]/60 bg-[#00ffcc]/5'
                    : 'border-[#1A2035] bg-black/40 hover:border-[#00ffcc]/40 hover:bg-[#00ffcc]/5'
                  }
                  disabled:cursor-not-allowed`}
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {wallet.icon}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-white group-hover:text-[#00ffcc] transition-colors">
                      {wallet.name}
                    </span>
                    {wallet.badge && (
                      <span className="text-[9px] uppercase tracking-widest font-mono px-1.5 py-0.5 border border-[#3b82f6]/40 text-[#3b82f6] bg-[#3b82f6]/10">
                        {wallet.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] font-mono text-zinc-500">
                    {wallet.description}
                  </p>
                </div>

                {/* Status / Arrow */}
                <div className="flex-shrink-0">
                  {isThisConnecting ? (
                    <div className="w-4 h-4 border border-[#00ffcc] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-[#00ffcc] transition-colors" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-4 px-4 py-3 border border-red-900/60 bg-red-950/30 text-red-400 font-mono text-xs">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1A2035] bg-black/40">
          <p className="text-[10px] font-mono text-zinc-600 text-center">
            By connecting, you agree to Astra's Terms of Protocol.
            Your keys never leave your wallet.
          </p>
        </div>
      </div>
    </div>
  );
}
