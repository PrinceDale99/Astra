'use client';

import React, { useState, useEffect } from 'react';
import useFreighter from '../../hooks/useFreighter';
import { generateRepoHealthProof } from '../../lib/zk/prover';
import { submitCreateRepoDeal } from '../../lib/stellar/repoTx';
import VaultScene from '../3d/VaultScene';
import KineticHeading from '../ui/KineticHeading';
import { Shield, Coins, Calendar, Key, AlertCircle, CheckCircle, Terminal } from 'lucide-react';

export default function RepoTerminal() {
  const { connected, publicKey, xlmBalance, error: walletError, loading: walletLoading, connectWallet } = useFreighter();
  
  // Form Inputs
  const [collateralAmount, setCollateralAmount] = useState<number>(50000);
  const [bondMaturityDate, setBondMaturityDate] = useState<string>('2027-12-31');
  const [institutionalSecret, setInstitutionalSecret] = useState<string>('astra_secret_salt_99');
  
  const [requestedLoanXLM, setRequestedLoanXLM] = useState<number>(10000);
  const [oraclePriceXLM, setOraclePriceXLM] = useState<number>(1.25); // scaled to 1e7 or handled locally
  const [minHealthFactor] = useState<number>(120); // 120%

  // Transaction States
  const [isProving, setIsProving] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [zkProofData, setZkProofData] = useState<any>(null);
  
  const [txLoading, setTxLoading] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parallax Scroll Tracking for the 3D core deformation
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress(window.scrollY / totalHeight);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGenerateProof = async () => {
    setIsProving(true);
    setErrorMessage(null);
    try {
      const maturityTimestamp = Math.floor(new Date(bondMaturityDate).getTime() / 1000);
      const currentTimestamp = Math.floor(Date.now() / 1000);

      const result = await generateRepoHealthProof({
        collateralAmount,
        bondMaturityDate: maturityTimestamp,
        institutionalSecret,
        requestedLoanXLM,
        oraclePriceXLM: Math.round(oraclePriceXLM * 1e7),
        minHealthFactor,
        currentTimestamp,
      });

      setZkProofData(result);
      setIsVerified(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'ZK Prover execution failed.');
    } finally {
      setIsProving(false);
    }
  };

  const handleExecuteRepo = async () => {
    if (!publicKey || !zkProofData) return;
    setTxLoading(true);
    setErrorMessage(null);
    try {
      const hash = await submitCreateRepoDeal({
        contractId: 'CDA34REPOSOROBANCONTRACTIDTESTNETXXXXX', // Mock or active deployed contract address
        borrower: publicKey,
        collateralToken: 'CASCOLLATERALYLDS34TOKENIDXXXXX', // Tokenized Treasury token address
        collateralAmount,
        borrowXlmAmount: requestedLoanXLM,
        proofBytes: zkProofData.proofBytes,
        publicSignals: zkProofData.publicSignals,
      });
      setTxHash(hash);
    } catch (err: any) {
      setErrorMessage(err.message || 'Soroban transaction failed.');
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#00ffcc] selection:text-black">
      {/* Sticky Marquee Kinetic Header */}
      <div className="sticky top-0 z-40">
        <KineticHeading text="Astra Protocol" />
      </div>

      <div className="container mx-auto px-6 py-12">
        {/* Broken / Organic Grid Layout */}
        <div className="grid grid-cols-12 gap-8 items-start">
          
          {/* Column Left: Institutional Terminal Controls (Broken Grid: Span 7 Offset 1) */}
          <div className="col-span-12 lg:col-span-7 lg:col-start-1 space-y-8 bg-[#0b0f19]/80 border border-[#1A2035]/80 p-8 rounded-none backdrop-blur-xl -rotate-1 relative z-20">
            
            {/* Terminal Header */}
            <div className="flex items-center justify-between border-b border-[#1A2035] pb-4">
              <div className="flex items-center gap-2 font-mono">
                <Terminal className="text-[#00ffcc] h-5 w-5 animate-pulse" />
                <span className="text-xs uppercase tracking-widest text-zinc-400">ASTRA_REPO_CORE_v1.0.3</span>
              </div>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            {/* Wallet Integration State */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-[#1A2035] bg-black/40 gap-4">
              <div>
                <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Borrower Identity</p>
                {connected && publicKey ? (
                  <p className="text-xs font-mono text-[#00ffcc] truncate max-w-[280px]">{publicKey}</p>
                ) : (
                  <p className="text-xs font-mono text-amber-500">Not Connected</p>
                )}
              </div>
              <div>
                {connected ? (
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">SAC Balance</p>
                    <p className="text-sm font-mono font-bold text-white">{xlmBalance} XLM</p>
                  </div>
                ) : (
                  <button
                    onClick={connectWallet}
                    disabled={walletLoading}
                    className="border border-[#00ffcc] bg-transparent text-[#00ffcc] font-mono text-xs uppercase tracking-widest px-4 py-2 hover:bg-[#00ffcc]/10 transition-all duration-300 disabled:opacity-50"
                  >
                    {walletLoading ? 'Accessing...' : 'Connect Freighter'}
                  </button>
                )}
              </div>
            </div>

            {/* Step 1: Collateral and Vault parameters */}
            <div className="space-y-6">
              <h2 className="text-sm font-mono tracking-wider uppercase text-zinc-300 flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#3b82f6]" />
                [01] ZK Collateral Parameters (Private)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase font-mono text-zinc-400 mb-2">Collateral Amount (YLDS)</label>
                  <input
                    type="number"
                    value={collateralAmount}
                    onChange={(e) => setCollateralAmount(Number(e.target.value))}
                    className="w-full bg-black border border-[#1A2035] px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#00ffcc] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-mono text-zinc-400 mb-2">Bond Maturity Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="date"
                      value={bondMaturityDate}
                      onChange={(e) => setBondMaturityDate(e.target.value)}
                      className="w-full bg-black border border-[#1A2035] pl-10 pr-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#00ffcc] transition-colors"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs uppercase font-mono text-zinc-400 mb-2">Institutional Secret Salt</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="password"
                      value={institutionalSecret}
                      onChange={(e) => setInstitutionalSecret(e.target.value)}
                      className="w-full bg-black border border-[#1A2035] pl-10 pr-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#00ffcc] transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Borrow / Lending Params */}
            <div className="space-y-6 pt-4">
              <h2 className="text-sm font-mono tracking-wider uppercase text-zinc-300 flex items-center gap-2">
                <Coins className="h-4 w-4 text-[#ffd700]" />
                [02] Overnight Repo Allocation (Public)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase font-mono text-zinc-400 mb-2">Requested XLM Loan</label>
                  <input
                    type="number"
                    value={requestedLoanXLM}
                    onChange={(e) => setRequestedLoanXLM(Number(e.target.value))}
                    className="w-full bg-black border border-[#1A2035] px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#00ffcc] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-mono text-zinc-400 mb-2">Oracle Price (XLM/YLDS)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={oraclePriceXLM}
                    onChange={(e) => setOraclePriceXLM(Number(e.target.value))}
                    className="w-full bg-black border border-[#1A2035] px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#00ffcc] transition-colors"
                  />
                </div>
              </div>

              {/* Health Indicator bar */}
              <div className="bg-black/60 border border-[#1A2035] p-4 flex flex-col gap-2 font-mono">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Min. Required Health:</span>
                  <span className="text-[#00ffcc] font-bold">{minHealthFactor}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Projected Collateralization:</span>
                  <span className="text-white">
                    {Math.round(((collateralAmount * oraclePriceXLM) / requestedLoanXLM) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Error notifications */}
            {(errorMessage || walletError) && (
              <div className="border border-red-950 bg-red-950/20 p-4 text-xs font-mono text-red-400 flex gap-3 items-center">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p>{errorMessage || walletError}</p>
              </div>
            )}

            {/* Success logs */}
            {txHash && (
              <div className="border border-emerald-950 bg-emerald-950/20 p-4 text-xs font-mono text-emerald-400 flex gap-3 items-center">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-bold uppercase tracking-wider">Repo Successfully Executed</p>
                  <p className="text-[10px] break-all select-all mt-1">{txHash}</p>
                </div>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <button
                onClick={handleGenerateProof}
                disabled={isProving}
                className="w-full border border-blue-500 bg-transparent text-blue-400 font-mono text-xs uppercase tracking-widest py-4 hover:bg-blue-500/10 transition-all duration-300 disabled:opacity-50"
              >
                {isProving ? 'Generating Proof...' : 'Generate ZK Proof'}
              </button>

              <button
                onClick={handleExecuteRepo}
                disabled={!isVerified || txLoading || !connected}
                className="w-full bg-[#00ffcc] text-black font-mono text-xs font-bold uppercase tracking-widest py-4 hover:bg-transparent hover:text-[#00ffcc] hover:border hover:border-[#00ffcc] transition-all duration-300 disabled:opacity-30 disabled:hover:bg-[#00ffcc]"
              >
                {txLoading ? 'Submitting to Soroban...' : 'Execute Repo Deal'}
              </button>
            </div>

          </div>

          {/* Column Right: Interactive 3D Canvas / Inspector (Broken Grid: Span 5 overlapping) */}
          <div className="col-span-12 lg:col-span-5 h-[650px] bg-[#0b0f19]/40 border border-[#1A2035]/80 p-2 rounded-none backdrop-blur-md rotate-1 relative z-10 lg:-ml-6 lg:mt-12">
            <VaultScene isVerified={isVerified} scrollProgress={scrollProgress} />
          </div>

        </div>
      </div>
    </div>
  );
}
