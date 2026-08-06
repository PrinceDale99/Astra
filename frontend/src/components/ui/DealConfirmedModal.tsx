'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Copy, ExternalLink, RefreshCw, Shield, Coins, Activity } from 'lucide-react';

interface DealConfirmedModalProps {
  txHash: string;
  collateralAmount: number;
  borrowedXLM: number;
  healthFactor: number;
  onReset: () => void;
}

export default function DealConfirmedModal({
  txHash,
  collateralAmount,
  borrowedXLM,
  healthFactor,
  onReset,
}: DealConfirmedModalProps) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  // Trigger entrance animation on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stellarExpertUrl = `https://stellar.expert/explorer/testnet/tx/${txHash}`;
  const shortHash = txHash ? `${txHash.slice(0, 8)}...${txHash.slice(-8)}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-xl border border-emerald-500/40 bg-[#070c10] shadow-[0_0_80px_rgba(52,211,153,0.15)] overflow-hidden"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(24px)',
          transition: 'opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1), transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Top glow bar */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/10 blur-[60px] pointer-events-none" />

        <div className="relative p-8 md:p-10">

          {/* Check Icon + Pulse */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              {/* Pulse rings */}
              <span className="absolute inset-0 rounded-full border border-emerald-400/40 animate-ping" style={{ animationDuration: '2s' }} />
              <span className="absolute inset-[-8px] rounded-full border border-emerald-400/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }} />
              <div className="relative w-20 h-20 rounded-full border-2 border-emerald-400 bg-emerald-950/60 flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.4)]">
                <CheckCircle className="w-10 h-10 text-emerald-400" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400/70 mb-2">
              Stellar Soroban · Testnet
            </p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white mb-2">
              Deal Executed
            </h2>
            <p className="text-sm font-mono text-zinc-400">
              ZK Proof verified on-chain. XLM disbursed to borrower.
            </p>
          </div>

          {/* Deal Summary */}
          <div className="border border-[#1A2035] bg-black/50 p-5 mb-5 space-y-3 font-mono text-sm">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Deal Summary</p>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-400">
                <Shield className="w-3.5 h-3.5 text-zinc-600" />
                Collateral Deposited
              </span>
              <span className="text-white font-bold">{collateralAmount.toLocaleString()} XLM</span>
            </div>

            <div className="h-px bg-[#1A2035]" />

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-400">
                <Coins className="w-3.5 h-3.5 text-zinc-600" />
                XLM Borrowed
              </span>
              <span className="text-[#00ffcc] font-bold">{borrowedXLM.toLocaleString()} XLM</span>
            </div>

            <div className="h-px bg-[#1A2035]" />

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-400">
                <Activity className="w-3.5 h-3.5 text-zinc-600" />
                Health Factor
              </span>
              <span className={`font-bold ${healthFactor >= 120 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {healthFactor}% <span className="text-xs text-emerald-600">✓ Healthy</span>
              </span>
            </div>

            <div className="h-px bg-[#1A2035]" />

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">ZK Proof</span>
              <span className="text-[#b582ff] font-bold text-xs">Groth16 · BN254 ✓</span>
            </div>
          </div>

          {/* Transaction Hash */}
          <div className="border border-[#1A2035] bg-black/50 p-5 mb-7">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-3">Transaction Hash</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 text-xs font-mono text-emerald-300 break-all leading-relaxed">
                {txHash}
              </code>
              <button
                onClick={handleCopy}
                title="Copy hash"
                className="flex-shrink-0 p-2 border border-[#1A2035] hover:border-emerald-500/50 hover:bg-emerald-950/40 transition-all duration-200 relative"
              >
                <Copy className="w-4 h-4 text-zinc-400 hover:text-emerald-400" />
                {copied && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-mono text-emerald-400 bg-black border border-emerald-900 px-2 py-1 whitespace-nowrap">
                    Copied!
                  </span>
                )}
              </button>
            </div>

            <a
              href={stellarExpertUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-[#00ffcc] transition-colors duration-200 group"
            >
              <ExternalLink className="w-3.5 h-3.5 group-hover:text-[#00ffcc]" />
              View on Stellar Expert
            </a>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onReset}
              className="flex-1 flex items-center justify-center gap-2 border border-[#1A2035] bg-transparent text-zinc-300 font-mono text-xs uppercase tracking-widest py-3 hover:border-zinc-500 hover:bg-zinc-900/50 transition-all duration-300"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Start New Deal
            </button>
            <a
              href={stellarExpertUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 border border-emerald-500/50 bg-emerald-950/30 text-emerald-400 font-mono text-xs uppercase tracking-widest py-3 hover:bg-emerald-500 hover:text-black transition-all duration-300"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Transaction
            </a>
          </div>

        </div>

        {/* Bottom glow bar */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
      </div>
    </div>
  );
}
