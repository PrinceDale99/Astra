'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useWallet from '../../hooks/useWallet';
import WalletSelectorModal from '../ui/WalletSelectorModal';
import { generateRepoHealthProof } from '../../lib/zk/prover';
import {
  submitCreateRepoDeal,
  submitRepayDeal,
  setupYldsTrustline,
  hasYldsTrustline,
} from '../../lib/stellar/repoTx';
import { CONTRACTS, YLDS_ASSET } from '../../config/contracts';
import VaultScene from '../3d/VaultScene';
import KineticHeading from '../ui/KineticHeading';
import DealConfirmedModal from '../ui/DealConfirmedModal';
import {
  Shield,
  Coins,
  Calendar,
  Key,
  AlertCircle,
  CheckCircle,
  Terminal,
  ArrowRight,
  Lock,
  RefreshCw,
  Zap,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────
const BACKEND_URL = 'https://astra-9mg6.onrender.com';
const STROOPS_PER_XLM = 10_000_000;

// ─── Step definitions ────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: '01. Identity Authentication',     color: '#00ffcc' },
  { id: 2, label: '02. Enable YLDS Receipt Token',   color: '#f59e0b' },
  { id: 3, label: '03. Collateral Parameters',       color: '#3b82f6' },
  { id: 4, label: '04. Borrow Allocation',           color: '#ffd700' },
  { id: 5, label: '05. Zero-Knowledge Computation',  color: '#b582ff' },
  { id: 6, label: '06. Protocol Execution',          color: '#00ffcc' },
] as const;

export default function RepoTerminal() {
  const {
    connected,
    publicKey,
    xlmBalance,
    walletType,
    error: walletError,
    loading: walletLoading,
    showSelector,
    openSelector,
    closeSelector,
    connectFreighter,
    connectWalletConnect,
  } = useWallet();

  // Connecting state for the wallet selector modal
  const [connectingWallet, setConnectingWallet] = useState<'freighter' | 'walletconnect' | null>(null);
  const [selectorError, setSelectorError] = useState<string | null>(null);

  const handleWalletSelect = async (wallet: 'freighter' | 'walletconnect') => {
    setConnectingWallet(wallet);
    setSelectorError(null);
    try {
      const key = wallet === 'freighter' ? await connectFreighter() : await connectWalletConnect();
      if (!key) setSelectorError(wallet === 'freighter' ? 'Freighter not found or access denied.' : 'WalletConnect cancelled.');
    } catch (err: any) {
      setSelectorError(err.message || 'Connection failed.');
    } finally {
      setConnectingWallet(null);
    }
  };

  // ─── Config (hardcoded from contracts.ts, optionally overridden by backend) ─
  const [yldsIssuer, setYldsIssuer] = useState<string>(YLDS_ASSET.issuer);
  const [yldsSacId, setYldsSacId] = useState<string>(CONTRACTS.YLDS_SAC);
  const [configLoaded, setConfigLoaded] = useState(true); // defaults are already set

  // ─── Form inputs ─────────────────────────────────────────────────────────
  // collateralAmount in XLM whole units; converted to stroops before submission
  const [collateralAmount, setCollateralAmount] = useState<number>(5000);
  const [bondMaturityDate, setBondMaturityDate] = useState<string>('2027-12-31');
  const [institutionalSecret, setInstitutionalSecret] = useState<string>('astra_secret_salt_99');
  const [requestedLoanXLM, setRequestedLoanXLM] = useState<number>(2500);
  const [oraclePriceXLM, setOraclePriceXLM] = useState<number>(1.0);
  const [minHealthFactor] = useState<number>(120);

  // ─── Transaction / UI states ─────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isCheckingTrustline, setIsCheckingTrustline] = useState(false);
  const [hasTrustline, setHasTrustline] = useState(false);
  const [trustlineLoading, setTrustlineLoading] = useState(false);
  const [isProving, setIsProving] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [zkProofData, setZkProofData] = useState<any>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [activeDealId, setActiveDealId] = useState<number | null>(null);
  const [isRepaying, setIsRepaying] = useState(false);
  const [repayHash, setRepayHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const xlmDepositStroops = Math.floor(collateralAmount * STROOPS_PER_XLM);
  const computedHealthFactor = Math.round(
    ((collateralAmount * oraclePriceXLM) / requestedLoanXLM) * 100
  );

  // ─── Fetch YLDS config from backend (override defaults if available) ────
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/v1/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        // Only override if backend provides non-empty values
        if (data?.yldsIssuer) setYldsIssuer(data.yldsIssuer);
        if (data?.yldsSacId) setYldsSacId(data.yldsSacId);
      })
      .catch(() => {}); // silently fall back to hardcoded defaults
  }, []);

  // ─── Scroll parallax ────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total > 0) setScrollProgress(window.scrollY / total);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ─── Auto-advance from Step 1 when wallet connects ──────────────────────
  useEffect(() => {
    if (connected && currentStep === 1) setCurrentStep(2);
  }, [connected, currentStep]);

  // ─── Auto-check trustline when entering Step 2 ──────────────────────────
  const checkTrustline = useCallback(async () => {
    if (!publicKey || !yldsIssuer) return;
    setIsCheckingTrustline(true);
    try {
      const result = await hasYldsTrustline(publicKey, yldsIssuer);
      setHasTrustline(result);
      if (result) setCurrentStep(3);
    } finally {
      setIsCheckingTrustline(false);
    }
  }, [publicKey, yldsIssuer]);

  useEffect(() => {
    if (currentStep === 2 && publicKey && yldsIssuer) {
      checkTrustline();
    }
  }, [currentStep, publicKey, yldsIssuer, checkTrustline]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleEnableTrustline = async () => {
    if (!publicKey || !yldsIssuer) return;
    setTrustlineLoading(true);
    setErrorMessage(null);
    try {
      await setupYldsTrustline(publicKey, yldsIssuer);
      setHasTrustline(true);
      setCurrentStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || 'Trustline setup failed.');
    } finally {
      setTrustlineLoading(false);
    }
  };

  const handleGenerateProof = async () => {
    setIsProving(true);
    setErrorMessage(null);
    try {
      const maturityTimestamp = Math.floor(new Date(bondMaturityDate).getTime() / 1000);
      const currentTimestamp = Math.floor(Date.now() / 1000);

      const result = await generateRepoHealthProof({
        collateralAmount: xlmDepositStroops,
        bondMaturityDate: maturityTimestamp,
        institutionalSecret,
        requestedLoanXLM: Math.floor(requestedLoanXLM * STROOPS_PER_XLM),
        oraclePriceXLM: Math.round(oraclePriceXLM * 1e7),
        minHealthFactor,
        currentTimestamp,
      });

      setZkProofData(result);
      setIsVerified(true);
      setCurrentStep(6);
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
        borrower: publicKey,
        xlmDepositAmount: xlmDepositStroops,
        proofBytes: zkProofData.proofBytes,
        publicSignals: zkProofData.publicSignals,
      });
      setTxHash(hash);
      // Extract deal ID from the contract return value (1-indexed counter)
      // The modal will display the hash; we store deal ID for repayment
    } catch (err: any) {
      console.error('[handleExecuteRepo] FAILED:', err);
      setErrorMessage(err.message || 'Soroban transaction failed.');
    } finally {
      setTxLoading(false);
    }
  };

  const handleRepay = async () => {
    if (!publicKey || activeDealId === null) return;
    setIsRepaying(true);
    setErrorMessage(null);
    try {
      const hash = await submitRepayDeal({ borrower: publicKey, dealId: activeDealId });
      setRepayHash(hash);
    } catch (err: any) {
      console.error('[handleRepay] FAILED:', err);
      setErrorMessage(err.message || 'Repayment transaction failed.');
    } finally {
      setIsRepaying(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(connected ? 2 : 1);
    setIsVerified(false);
    setZkProofData(null);
    setTxHash(null);
    setRepayHash(null);
    setActiveDealId(null);
    setErrorMessage(null);
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen bg-[#030508] text-white selection:bg-[#00ffcc] selection:text-black font-sans overflow-x-hidden">

      {/* Wallet Selector Modal */}
      <WalletSelectorModal
        isOpen={showSelector}
        onClose={closeSelector}
        onSelect={handleWalletSelect}
        isConnecting={!!connectingWallet}
        connectingWallet={connectingWallet}
        error={selectorError}
      />

      {/* Success Modal */}
      {txHash && (
        <DealConfirmedModal
          txHash={txHash}
          collateralAmount={collateralAmount}
          borrowedXLM={requestedLoanXLM}
          healthFactor={computedHealthFactor}
          onReset={handleReset}
        />
      )}

      {/* 3D Background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none transition-opacity duration-1000"
        style={{ opacity: isVerified ? 0.6 : 0.3 }}
      >
        <VaultScene isVerified={isVerified} scrollProgress={scrollProgress} />
      </div>
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#030508]/80 via-transparent to-[#030508] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-24">

        {/* Header */}
        <div className="mb-16 text-center">
          <KineticHeading text="Astra Repo" />
          <p className="mt-4 text-zinc-400 font-mono text-sm tracking-widest uppercase">
            Zero-Knowledge Tri-Party Protocol
          </p>
          <p className="mt-2 text-zinc-600 font-mono text-xs">
            Deposit XLM → Receive YLDS receipt tokens → Repay to reclaim XLM
          </p>
        </div>

        {/* Global Error Banner */}
        {(errorMessage || walletError) && (
          <div className="mb-8 border border-red-950 bg-red-950/40 p-4 text-sm font-mono text-red-400 flex gap-3 items-center backdrop-blur-md">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{errorMessage || walletError}</p>
          </div>
        )}

        <div className="space-y-6">

          {/* ── STEP 1: Connect Wallet ─────────────────────────────────── */}
          <StepCard step={1} currentStep={currentStep} activeColor="#00ffcc" label="01. Identity Authentication" isDone={connected}>
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-[#1A2035] bg-black/40 gap-4">
              <div>
                <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 mb-1">Borrower Identity</p>
                {connected && publicKey ? (
                  <p className="text-sm font-mono text-[#00ffcc] break-all">{publicKey}</p>
                ) : (
                  <p className="text-sm font-mono text-amber-500">Not Connected</p>
                )}
              </div>
              <div className="flex-shrink-0">
                {connected ? (
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 mb-1">XLM Balance</p>
                    <p className="text-lg font-mono font-bold text-white">{xlmBalance} XLM</p>
                    <p className="text-[10px] font-mono text-zinc-600 mt-1">
                      via {walletType === 'freighter' ? '🟣 Freighter' : '🔵 WalletConnect'}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={openSelector}
                    disabled={walletLoading}
                    className="border border-[#00ffcc] bg-[#00ffcc]/10 text-[#00ffcc] font-mono text-xs uppercase tracking-widest px-6 py-3 hover:bg-[#00ffcc] hover:text-black transition-all duration-300 disabled:opacity-50 flex items-center gap-2"
                  >
                    {walletLoading ? 'Connecting...' : 'Connect Wallet'}
                    {!walletLoading && <ArrowRight className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          </StepCard>

          {/* ── STEP 2: Enable YLDS Trustline ─────────────────────────── */}
          <StepCard step={2} currentStep={currentStep} activeColor="#f59e0b" label="02. Enable YLDS Receipt Token" isDone={hasTrustline}>
            <div className="mt-6 space-y-4">
              <div className="bg-black/40 border border-[#1A2035] p-5 font-mono text-sm text-zinc-400 space-y-3">
                <p>
                  YLDS is Astra's ZK-backed receipt token. When you deposit XLM, the protocol
                  issues an equivalent amount of YLDS to your wallet. On maturity, return the YLDS
                  to unlock your XLM.
                </p>
                <div className="flex items-center gap-2 p-3 bg-amber-950/30 border border-amber-800/40 text-amber-400 text-xs">
                  <Zap className="w-4 h-4 flex-shrink-0" />
                  <span>
                    This is a one-click Freighter signature for a Stellar <code>changeTrust</code> operation.
                    It's only required once per wallet.
                  </span>
                </div>
                {yldsIssuer && (
                  <div className="text-[10px] text-zinc-600 break-all">
                    YLDS Issuer: {yldsIssuer}
                  </div>
                )}
              </div>

              {isCheckingTrustline ? (
                <div className="flex items-center gap-2 text-zinc-500 font-mono text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Checking existing trustline...
                </div>
              ) : hasTrustline ? (
                <div className="flex items-center gap-3 text-[#00ffcc] bg-[#00ffcc]/10 p-3 border border-[#00ffcc]/30 font-mono text-sm">
                  <CheckCircle className="w-5 h-5" /> YLDS trustline already active
                </div>
              ) : (
                <button
                  onClick={handleEnableTrustline}
                  disabled={trustlineLoading || !yldsIssuer}
                  className="w-full border border-amber-500 bg-amber-500/10 text-amber-400 font-mono text-xs uppercase tracking-widest py-4 hover:bg-amber-500 hover:text-black transition-all duration-300 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {trustlineLoading ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Signing in Freighter...</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Enable YLDS in Wallet</>
                  )}
                </button>
              )}
            </div>
          </StepCard>

          {/* ── STEP 3: Collateral Parameters ─────────────────────────── */}
          <StepCard step={3} currentStep={currentStep} activeColor="#3b82f6" label="03. Collateral Parameters" isDone={currentStep > 3}>
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase font-mono text-zinc-400 mb-2">
                    XLM Deposit Amount (whole XLM)
                  </label>
                  <input
                    type="number"
                    value={collateralAmount}
                    onChange={(e) => setCollateralAmount(Number(e.target.value))}
                    disabled={currentStep !== 3}
                    className="w-full bg-black border border-[#1A2035] px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors disabled:opacity-50"
                  />
                  <p className="mt-1 text-[10px] font-mono text-zinc-600">
                    = {xlmDepositStroops.toLocaleString()} stroops
                  </p>
                </div>
                <div>
                  <label className="block text-xs uppercase font-mono text-zinc-400 mb-2">Bond Maturity Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="date"
                      value={bondMaturityDate}
                      onChange={(e) => setBondMaturityDate(e.target.value)}
                      disabled={currentStep !== 3}
                      className="w-full bg-black border border-[#1A2035] pl-10 pr-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors disabled:opacity-50"
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
                      disabled={currentStep !== 3}
                      className="w-full bg-black border border-[#1A2035] pl-10 pr-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors disabled:opacity-50"
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-zinc-500 font-mono">
                    This value never leaves your browser. It is hashed into the public signals.
                  </p>
                </div>
              </div>

              {currentStep === 3 && (
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="border border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6] font-mono text-xs uppercase tracking-widest px-6 py-3 hover:bg-[#3b82f6] hover:text-black transition-all duration-300 flex items-center gap-2"
                  >
                    Confirm Parameters <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </StepCard>

          {/* ── STEP 4: Borrow Allocation ──────────────────────────────── */}
          <StepCard step={4} currentStep={currentStep} activeColor="#ffd700" label="04. Borrow Allocation" isDone={currentStep > 4}>
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase font-mono text-zinc-400 mb-2">
                    Requested XLM Loan (whole XLM)
                  </label>
                  <input
                    type="number"
                    value={requestedLoanXLM}
                    onChange={(e) => setRequestedLoanXLM(Number(e.target.value))}
                    disabled={currentStep !== 4}
                    className="w-full bg-black border border-[#1A2035] px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#ffd700] transition-colors disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-mono text-zinc-400 mb-2">Oracle Price (XLM/XLM)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={oraclePriceXLM}
                    onChange={(e) => setOraclePriceXLM(Number(e.target.value))}
                    disabled={currentStep !== 4}
                    className="w-full bg-black border border-[#1A2035] px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#ffd700] transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="bg-black/60 border border-[#1A2035] p-5 flex flex-col gap-3 font-mono">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Min. Required Health:</span>
                  <span className="text-[#00ffcc] font-bold text-lg">{minHealthFactor}%</span>
                </div>
                <div className="h-px w-full bg-[#1A2035]" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Projected Collateralization:</span>
                  <span className={`text-lg font-bold ${computedHealthFactor >= minHealthFactor ? 'text-emerald-400' : 'text-red-400'}`}>
                    {computedHealthFactor}%
                  </span>
                </div>
                <div className="h-px w-full bg-[#1A2035]" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">You Deposit:</span>
                  <span className="text-white font-bold">{collateralAmount.toLocaleString()} XLM</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">You Receive (YLDS):</span>
                  <span className="text-amber-400 font-bold">{collateralAmount.toLocaleString()} YLDS</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Interest (1%, on maturity):</span>
                  <span className="text-red-400 font-bold">{(collateralAmount * 0.01).toFixed(2)} XLM</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Net XLM Return:</span>
                  <span className="text-emerald-400 font-bold">{(collateralAmount * 0.99).toFixed(2)} XLM</span>
                </div>
              </div>

              {currentStep === 4 && (
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setCurrentStep(5)}
                    disabled={computedHealthFactor < minHealthFactor}
                    className="border border-[#ffd700] bg-[#ffd700]/10 text-[#ffd700] font-mono text-xs uppercase tracking-widest px-6 py-3 hover:bg-[#ffd700] hover:text-black transition-all duration-300 disabled:opacity-30 flex items-center gap-2"
                  >
                    Confirm Terms <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </StepCard>

          {/* ── STEP 5: ZK Proof Generation ───────────────────────────── */}
          <StepCard step={5} currentStep={currentStep} activeColor="#b582ff" label="05. Zero-Knowledge Computation" isDone={isVerified}>
            <div className="mt-6">
              <div className="bg-black/40 border border-[#1A2035] p-6 font-mono text-sm text-zinc-400 space-y-4">
                <p>
                  Generate a Groth16 cryptographic proof confirming your collateralization
                  exceeds the minimum health factor without revealing your private parameters
                  to the network.
                </p>
                {isVerified ? (
                  <div className="flex items-center gap-3 text-[#00ffcc] bg-[#00ffcc]/10 p-3 border border-[#00ffcc]/30">
                    <CheckCircle className="w-5 h-5" /> Proof Generated Successfully
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateProof}
                    disabled={isProving}
                    className="w-full border border-[#b582ff] bg-[#b582ff]/10 text-[#b582ff] font-mono text-xs uppercase tracking-widest py-4 hover:bg-[#b582ff] hover:text-black transition-all duration-300 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isProving ? (
                      <><Terminal className="w-4 h-4 animate-spin" /> Computing Circuit...</>
                    ) : (
                      'Generate ZK Proof'
                    )}
                  </button>
                )}
              </div>
            </div>
          </StepCard>

          {/* ── STEP 6: Execute + Repay ───────────────────────────────── */}
          <StepCard step={6} currentStep={currentStep} activeColor="#00ffcc" label="06. Protocol Execution" isDone={!!txHash}>
            <div className="mt-6 space-y-4">

              {/* Deal Summary */}
              <div className="bg-black/40 border border-[#1A2035] p-5 font-mono text-sm space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500">You Send</span>
                  <span className="text-white font-bold">{collateralAmount.toLocaleString()} XLM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">You Receive</span>
                  <span className="text-amber-400 font-bold">{collateralAmount.toLocaleString()} YLDS</span>
                </div>
                <div className="h-px bg-[#1A2035]" />
                <div className="flex justify-between">
                  <span className="text-zinc-500">Maturity</span>
                  <span className="text-zinc-300">{bondMaturityDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">To Repay</span>
                  <span className="text-zinc-300">{collateralAmount.toLocaleString()} YLDS → {(collateralAmount * 0.99).toFixed(2)} XLM</span>
                </div>
              </div>

              {/* Execute Button */}
              {!txHash ? (
                <button
                  onClick={handleExecuteRepo}
                  disabled={txLoading || !connected || !isVerified}
                  className="w-full bg-[#00ffcc] text-black font-mono text-sm font-bold uppercase tracking-widest py-5 hover:bg-transparent hover:text-[#00ffcc] border border-transparent hover:border-[#00ffcc] transition-all duration-300 disabled:opacity-30 flex justify-center items-center gap-2"
                >
                  {txLoading ? (
                    <><Terminal className="w-4 h-4 animate-spin" /> Submitting to Soroban...</>
                  ) : (
                    <><Shield className="w-4 h-4" /> Sign &amp; Execute Deposit</>
                  )}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="border border-emerald-800/50 bg-emerald-950/30 p-4 font-mono text-sm space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle className="w-5 h-5" /> Deposit Confirmed
                    </div>
                    <p className="text-zinc-500 text-xs break-all">Tx: {txHash}</p>
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00ffcc] text-xs hover:underline"
                    >
                      View on Stellar Expert →
                    </a>
                  </div>

                  {/* Repayment Section */}
                  {!repayHash ? (
                    <div className="space-y-3">
                      <p className="text-zinc-500 font-mono text-xs">
                        When you're ready to close the position, return your YLDS to reclaim XLM.
                      </p>
                      {activeDealId !== null ? (
                        <button
                          onClick={handleRepay}
                          disabled={isRepaying}
                          className="w-full border border-amber-500 bg-amber-500/10 text-amber-400 font-mono text-xs uppercase tracking-widest py-4 hover:bg-amber-500 hover:text-black transition-all duration-300 disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                          {isRepaying ? (
                            <><Terminal className="w-4 h-4 animate-spin" /> Processing Repayment...</>
                          ) : (
                            <><Coins className="w-4 h-4" /> Repay YLDS &amp; Reclaim XLM</>
                          )}
                        </button>
                      ) : (
                        <p className="text-zinc-600 font-mono text-xs italic">
                          Deal ID required for repayment — parsed from transaction result.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="border border-amber-800/50 bg-amber-950/30 p-4 font-mono text-sm space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 font-bold">
                        <CheckCircle className="w-5 h-5" /> Repayment Confirmed — XLM Released
                      </div>
                      <p className="text-zinc-500 text-xs break-all">Tx: {repayHash}</p>
                      <button
                        onClick={handleReset}
                        className="mt-2 text-[#00ffcc] text-xs font-mono hover:underline"
                      >
                        Start New Deal →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </StepCard>

        </div>
      </div>
    </div>
  );
}

// ─── Step Card Component ─────────────────────────────────────────────────────

function StepCard({
  step,
  currentStep,
  activeColor,
  label,
  isDone,
  children,
}: {
  step: number;
  currentStep: number;
  activeColor: string;
  label: string;
  isDone?: boolean;
  children: React.ReactNode;
}) {
  const isActive = currentStep === step;
  const isPast = currentStep > step;
  const isFuture = currentStep < step;

  return (
    <div
      className={`transition-all duration-500 border p-6 md:p-8 backdrop-blur-xl ${
        isActive
          ? `border-current bg-[#0b0f19]/80`
          : isPast
          ? 'border-[#1A2035] bg-[#0b0f19]/40'
          : 'border-[#1A2035]/30 bg-[#0b0f19]/20 opacity-40 pointer-events-none'
      }`}
      style={isActive ? { borderColor: activeColor, boxShadow: `0 0 30px ${activeColor}1a` } : {}}
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          className="font-mono text-lg uppercase tracking-wider flex items-center gap-3"
          style={{ color: isActive ? activeColor : isPast ? '#d1d5db' : '#71717a' }}
        >
          {label}
        </h2>
        {isDone && <CheckCircle className="text-emerald-500 w-5 h-5" />}
      </div>
      {(isActive || isPast) && children}
    </div>
  );
}
