'use client';

import React, { useState, useEffect } from 'react';
import useFreighter from '../../hooks/useFreighter';
import { generateRepoHealthProof } from '../../lib/zk/prover';
import { submitCreateRepoDeal } from '../../lib/stellar/repoTx';
import { setupTrustline } from '../../lib/stellar/trustlineTx';
import VaultScene from '../3d/VaultScene';
import KineticHeading from '../ui/KineticHeading';
import DealConfirmedModal from '../ui/DealConfirmedModal';
import { Shield, Coins, Calendar, Key, AlertCircle, CheckCircle, Terminal, ArrowRight, Lock } from 'lucide-react';

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
  const [trustlineLoading, setTrustlineLoading] = useState<boolean>(false);
  const [trustlineSet, setTrustlineSet] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parallax Scroll Tracking for the 3D core deformation
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Step Wizard State
  const [currentStep, setCurrentStep] = useState<number>(1);

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
      setCurrentStep(5); // Move to execute step
    } catch (err: any) {
      setErrorMessage(err.message || 'ZK Prover execution failed.');
    } finally {
      setIsProving(false);
    }
  };

  const handleSetupTrustline = async () => {
    if (!publicKey) return;
    setTrustlineLoading(true);
    setErrorMessage(null);
    try {
      await setupTrustline(
        publicKey,
        'YLDS',
        'GDVRZPTSO6D2LCGYTSLEMVZVXMDZXSOCDDGWJ4J5EOBURW3TPKD6GYAL'
      );
      setTrustlineSet(true);
      setCurrentStep(6);
    } catch (err: any) {
      setErrorMessage(err.message || 'Trustline setup failed.');
    } finally {
      setTrustlineLoading(false);
    }
  };

  const handleExecuteRepo = async () => {
    if (!publicKey || !zkProofData) return;
    setTxLoading(true);
    setErrorMessage(null);
    try {
      const hash = await submitCreateRepoDeal({
        contractId: 'CDGKWTX3V2YZA4KTOKU6S6L5PXT6FAIU5IIEYMWFHSVYF2H27CWG6HC5',
        borrower: publicKey,
        xlmDepositAmount: collateralAmount,
        proofBytes: zkProofData.proofBytes,
        publicSignals: zkProofData.publicSignals,
      });
      setTxHash(hash);
    } catch (err: any) {
      console.error('[handleExecuteRepo] FAILED:', err);
      setErrorMessage(err.message || 'Soroban transaction failed.');
    } finally {
      setTxLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setIsVerified(false);
    setZkProofData(null);
    setTxHash(null);
    setErrorMessage(null);
  };

  const computedHealthFactor = Math.round(
    ((collateralAmount * oraclePriceXLM) / requestedLoanXLM) * 100
  );

  // Auto-advance from Step 1 if connected
  useEffect(() => {
    if (connected && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [connected, currentStep]);

  return (
    <div className="relative min-h-screen bg-[#030508] text-white selection:bg-[#00ffcc] selection:text-black font-sans overflow-x-hidden">

      {/* Success Modal — rendered on top of everything when txHash is available */}
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
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none transition-opacity duration-1000" style={{ opacity: isVerified ? 0.6 : 0.3 }}>
        <VaultScene isVerified={isVerified} scrollProgress={scrollProgress} />
      </div>
      
      {/* Dark overlay for readability */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#030508]/80 via-transparent to-[#030508] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-24">
        
        <div className="mb-16 text-center">
          <KineticHeading text="Astra Repo" />
          <p className="mt-4 text-zinc-400 font-mono text-sm tracking-widest uppercase">Zero-Knowledge Tri-Party Protocol</p>
        </div>

        {/* Global Errors */}
        {(errorMessage || walletError) && (
          <div className="mb-8 border border-red-950 bg-red-950/40 p-4 text-sm font-mono text-red-400 flex gap-3 items-center backdrop-blur-md">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{errorMessage || walletError}</p>
          </div>
        )}

        {/* Steps Container */}
        <div className="space-y-6">
          
          {/* STEP 1: Connect Wallet */}
          <div className={`transition-all duration-500 border p-6 md:p-8 backdrop-blur-xl ${currentStep === 1 ? 'border-[#00ffcc] bg-[#0b0f19]/80 shadow-[0_0_30px_rgba(0,255,204,0.1)]' : currentStep > 1 ? 'border-[#1A2035] bg-[#0b0f19]/40' : 'border-[#1A2035]/30 bg-[#0b0f19]/20 opacity-50'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-mono text-lg uppercase tracking-wider flex items-center gap-3 ${currentStep === 1 ? 'text-[#00ffcc]' : 'text-zinc-300'}`}>
                <span className="text-zinc-500 text-sm">01.</span> Identity Authentication
              </h2>
              {connected && <CheckCircle className="text-emerald-500 w-5 h-5" />}
            </div>
            
            {currentStep >= 1 && (
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
                      <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 mb-1">SAC Balance</p>
                      <p className="text-lg font-mono font-bold text-white">{xlmBalance} XLM</p>
                    </div>
                  ) : (
                    <button
                      onClick={connectWallet}
                      disabled={walletLoading}
                      className="border border-[#00ffcc] bg-[#00ffcc]/10 text-[#00ffcc] font-mono text-xs uppercase tracking-widest px-6 py-3 hover:bg-[#00ffcc] hover:text-black transition-all duration-300 disabled:opacity-50 flex items-center gap-2"
                    >
                      {walletLoading ? 'Accessing...' : 'Connect Freighter'}
                      {!walletLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: ZK Collateral Parameters */}
          <div className={`transition-all duration-500 border p-6 md:p-8 backdrop-blur-xl ${currentStep === 2 ? 'border-[#3b82f6] bg-[#0b0f19]/80 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : currentStep > 2 ? 'border-[#1A2035] bg-[#0b0f19]/40' : 'border-[#1A2035]/30 bg-[#0b0f19]/20 opacity-40 pointer-events-none'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-mono text-lg uppercase tracking-wider flex items-center gap-3 ${currentStep === 2 ? 'text-[#3b82f6]' : 'text-zinc-300'}`}>
                <span className="text-zinc-500 text-sm">02.</span> Collateral Parameters <Lock className="w-4 h-4 ml-2 text-zinc-500" />
              </h2>
              {currentStep > 2 && <CheckCircle className="text-emerald-500 w-5 h-5" />}
            </div>
            
            {currentStep >= 2 && (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase font-mono text-zinc-400 mb-2">Deposit Amount (XLM)</label>
                    <input
                      type="number"
                      value={collateralAmount}
                      onChange={(e) => setCollateralAmount(Number(e.target.value))}
                      disabled={currentStep !== 2}
                      className="w-full bg-black border border-[#1A2035] px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors disabled:opacity-50"
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
                        disabled={currentStep !== 2}
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
                        disabled={currentStep !== 2}
                        className="w-full bg-black border border-[#1A2035] pl-10 pr-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors disabled:opacity-50"
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-zinc-500 font-mono">This value never leaves your browser. It is hashed into the public signals.</p>
                  </div>
                </div>
                
                {currentStep === 2 && (
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="border border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6] font-mono text-xs uppercase tracking-widest px-6 py-3 hover:bg-[#3b82f6] hover:text-black transition-all duration-300 flex items-center gap-2"
                    >
                      Confirm Collateral <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 3: Lending Parameters */}
          <div className={`transition-all duration-500 border p-6 md:p-8 backdrop-blur-xl ${currentStep === 3 ? 'border-[#ffd700] bg-[#0b0f19]/80 shadow-[0_0_30px_rgba(255,215,0,0.1)]' : currentStep > 3 ? 'border-[#1A2035] bg-[#0b0f19]/40' : 'border-[#1A2035]/30 bg-[#0b0f19]/20 opacity-40 pointer-events-none'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-mono text-lg uppercase tracking-wider flex items-center gap-3 ${currentStep === 3 ? 'text-[#ffd700]' : 'text-zinc-300'}`}>
                <span className="text-zinc-500 text-sm">03.</span> Borrow Allocation
              </h2>
              {currentStep > 3 && <CheckCircle className="text-emerald-500 w-5 h-5" />}
            </div>
            
            {currentStep >= 3 && (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase font-mono text-zinc-400 mb-2">Estimated YLDS Return</label>
                    <input
                      type="number"
                      value={requestedLoanXLM}
                      onChange={(e) => setRequestedLoanXLM(Number(e.target.value))}
                      disabled={currentStep !== 3}
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
                      disabled={currentStep !== 3}
                      className="w-full bg-black border border-[#1A2035] px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#ffd700] transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="bg-black/60 border border-[#1A2035] p-5 flex flex-col gap-3 font-mono">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">Min. Required Health:</span>
                    <span className="text-[#00ffcc] font-bold text-lg">{minHealthFactor}%</span>
                  </div>
                  <div className="h-px w-full bg-[#1A2035]"></div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">Projected Collateralization:</span>
                    <span className="text-white text-lg font-bold">
                      {Math.round(((collateralAmount * oraclePriceXLM) / requestedLoanXLM) * 100)}%
                    </span>
                  </div>
                </div>

                {currentStep === 3 && (
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="border border-[#ffd700] bg-[#ffd700]/10 text-[#ffd700] font-mono text-xs uppercase tracking-widest px-6 py-3 hover:bg-[#ffd700] hover:text-black transition-all duration-300 flex items-center gap-2"
                    >
                      Confirm Terms <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 4: ZK Proof Generation */}
          <div className={`transition-all duration-500 border p-6 md:p-8 backdrop-blur-xl ${currentStep === 4 ? 'border-[#b582ff] bg-[#0b0f19]/80 shadow-[0_0_30px_rgba(181,130,255,0.1)]' : currentStep > 4 ? 'border-[#1A2035] bg-[#0b0f19]/40' : 'border-[#1A2035]/30 bg-[#0b0f19]/20 opacity-40 pointer-events-none'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-mono text-lg uppercase tracking-wider flex items-center gap-3 ${currentStep === 4 ? 'text-[#b582ff]' : 'text-zinc-300'}`}>
                <span className="text-zinc-500 text-sm">04.</span> Zero-Knowledge Computation
              </h2>
              {currentStep > 4 && <CheckCircle className="text-emerald-500 w-5 h-5" />}
            </div>

            {currentStep >= 4 && (
              <div className="mt-6">
                <div className="bg-black/40 border border-[#1A2035] p-6 font-mono text-sm text-zinc-400">
                  <p className="mb-4">Generate a Groth16 cryptographic proof confirming your collateralization exceeds the minimum health factor without revealing your private parameters to the network.</p>
                  
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
                        <>
                          <Terminal className="w-4 h-4 animate-spin" /> Computing Circuit...
                        </>
                      ) : (
                        'Generate ZK Proof'
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* STEP 5: Setup Trustline */}
          <div className={`transition-all duration-500 border p-6 md:p-8 backdrop-blur-xl ${currentStep === 5 ? 'border-[#ffaa00] bg-[#0b0f19]/80 shadow-[0_0_30px_rgba(255,170,0,0.1)]' : currentStep > 5 ? 'border-[#1A2035] bg-[#0b0f19]/40' : 'border-[#1A2035]/30 bg-[#0b0f19]/20 opacity-40 pointer-events-none'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-mono text-lg uppercase tracking-wider flex items-center gap-3 ${currentStep === 5 ? 'text-[#ffaa00]' : 'text-zinc-300'}`}>
                <span className="text-zinc-500 text-sm">05.</span> Asset Trustline Setup
              </h2>
              {currentStep > 5 && <CheckCircle className="text-emerald-500 w-5 h-5" />}
            </div>

            {currentStep >= 5 && (
              <div className="mt-6">
                <div className="bg-black/40 border border-[#1A2035] p-6 font-mono text-sm text-zinc-400 mb-6">
                  <p>In order to receive YLDS Receipt Tokens from the smart contract, your stellar account must first establish a trustline with the YLDS asset issuer.</p>
                </div>
                
                {trustlineSet ? (
                  <div className="flex items-center gap-3 text-[#ffaa00] bg-[#ffaa00]/10 p-4 border border-[#ffaa00]/30 font-mono text-sm">
                    <CheckCircle className="w-5 h-5" /> Trustline Established
                  </div>
                ) : (
                  <button
                    onClick={handleSetupTrustline}
                    disabled={trustlineLoading}
                    className="w-full bg-[#ffaa00]/10 border border-[#ffaa00] text-[#ffaa00] font-mono text-sm font-bold uppercase tracking-widest py-5 hover:bg-[#ffaa00] hover:text-black transition-all duration-300 disabled:opacity-30 flex justify-center items-center gap-2"
                  >
                    {trustlineLoading ? (
                      <>
                        <Terminal className="w-4 h-4 animate-spin" /> Submitting to Freighter...
                      </>
                    ) : (
                      'Establish YLDS Trustline'
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* STEP 6: Execute Transaction */}
          <div className={`transition-all duration-500 border p-6 md:p-8 backdrop-blur-xl ${currentStep === 6 ? 'border-[#00ffcc] bg-[#0b0f19]/80 shadow-[0_0_30px_rgba(0,255,204,0.1)]' : currentStep > 6 ? 'border-emerald-500/50 bg-[#0b0f19]/40' : 'border-[#1A2035]/30 bg-[#0b0f19]/20 opacity-40 pointer-events-none'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-mono text-lg uppercase tracking-wider flex items-center gap-3 ${currentStep === 6 ? 'text-[#00ffcc]' : 'text-zinc-300'}`}>
                <span className="text-zinc-500 text-sm">06.</span> Protocol Execution
              </h2>
            </div>

            {currentStep >= 6 && (
              <div className="mt-6">
                <button
                  onClick={handleExecuteRepo}
                  disabled={txLoading || !connected}
                  className="w-full bg-[#00ffcc] text-black font-mono text-sm font-bold uppercase tracking-widest py-5 hover:bg-transparent hover:text-[#00ffcc] hover:border hover:border-[#00ffcc] transition-all duration-300 disabled:opacity-30 flex justify-center items-center gap-2"
                >
                  {txLoading ? (
                    <>
                      <Terminal className="w-4 h-4 animate-spin" /> Submitting to Soroban...
                    </>
                  ) : (
                    'Sign & Execute Deal'
                  )}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
