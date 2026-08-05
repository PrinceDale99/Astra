'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Shield, Zap, Lock, BarChart3, Database } from 'lucide-react';
import VaultScene from '../components/3d/VaultScene';
import KineticHeading from '../components/ui/KineticHeading';

export default function LandingPage() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress(window.scrollY / totalHeight);
      }
    };
    window.addEventListener('scroll', handleScroll);

    import('gsap').then(({ default: gsap }) => {
      import('gsap/ScrollTrigger').then(({ default: ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger);

        const ctx = gsap.context(() => {
          // Hero Stagger
          gsap.from(".hero-element", {
            y: 50,
            opacity: 0,
            duration: 1.2,
            stagger: 0.2,
            ease: "power4.out",
            delay: 0.2
          });

          // Metrics Strip
          gsap.from(".metric-card", {
            scrollTrigger: {
              trigger: ".metrics-section",
              start: "top 85%",
            },
            y: 30,
            opacity: 0,
            duration: 1,
            stagger: 0.1,
            ease: "back.out(1.7)"
          });

          // Feature Cards
          gsap.from(".feature-card", {
            scrollTrigger: {
              trigger: "#features",
              start: "top 75%",
            },
            y: 50,
            opacity: 0,
            duration: 1,
            stagger: 0.15,
            ease: "power3.out"
          });
          
          // CTA Section
          gsap.from(".cta-content", {
            scrollTrigger: {
              trigger: ".cta-section",
              start: "top 80%",
            },
            scale: 0.9,
            opacity: 0,
            duration: 1.2,
            ease: "elastic.out(1, 0.5)"
          });
        });

        return () => ctx.revert();
      });
    });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="relative min-h-screen bg-[#030508] text-white selection:bg-[#00ffcc] selection:text-black overflow-x-hidden font-sans">
      
      {/* Immersive 3D Background */}
      <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
        <VaultScene isVerified={false} scrollProgress={scrollProgress} />
      </div>

      {/* Fade overlay so text pops */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-transparent via-[#030508]/80 to-[#030508] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-6 border-b border-[#1A2035]/50 bg-[#030508]/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-[#00ffcc] flex items-center justify-center shadow-[0_0_15px_rgba(0,255,204,0.3)]">
            <div className="w-3 h-3 rounded-full bg-[#00ffcc]" />
          </div>
          <span className="font-mono text-xl tracking-widest uppercase font-bold text-white">Astra</span>
        </div>
        <div className="hidden md:flex gap-8 font-mono text-xs uppercase tracking-widest text-zinc-400">
          <a href="#about" className="hover:text-[#00ffcc] transition-colors">Protocol</a>
          <a href="#features" className="hover:text-[#00ffcc] transition-colors">ZK-Security</a>
          <a href="#soroban" className="hover:text-[#00ffcc] transition-colors">Soroban native</a>
        </div>
        <Link href="/terminal" className="border border-[#00ffcc] bg-[#00ffcc]/10 text-[#00ffcc] font-mono text-xs uppercase tracking-widest px-6 py-2 hover:bg-[#00ffcc] hover:text-black transition-all duration-300">
          Launch App
        </Link>
      </nav>

      <div className="relative z-20">
        
        {/* HERO SECTION */}
        <section className="min-h-[90vh] flex flex-col justify-center items-center text-center px-4 pt-12 pb-24">
          <div className="hero-element inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1A2035] bg-[#0b0f19]/80 backdrop-blur-md mb-8">
            <span className="w-2 h-2 rounded-full bg-[#00ffcc] animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-300">Stellar Protocol 27 Ready</span>
          </div>

          <div className="hero-element mb-8 relative max-w-5xl">
            <div className="absolute inset-0 blur-[100px] bg-[#00ffcc]/10 rounded-full" />
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white mb-6 leading-[1.1]">
              Zero-Knowledge <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ffcc] to-[#3b82f6]">Institutional Repo</span>
            </h1>
          </div>
          
          <p className="hero-element max-w-2xl text-lg md:text-xl text-zinc-400 font-light mb-12 leading-relaxed">
            The tri-party repo protocol for tokenized treasuries. Borrow native XLM against real-world assets with privacy-preserving ZK proofs validated directly on Soroban.
          </p>
          
          <div className="hero-element flex flex-col sm:flex-row gap-6">
            <Link href="/terminal" className="flex items-center justify-center gap-3 border border-[#00ffcc] bg-[#00ffcc] text-black font-mono text-sm font-bold uppercase tracking-widest px-8 py-4 hover:bg-transparent hover:text-[#00ffcc] transition-all duration-300 group shadow-[0_0_30px_rgba(0,255,204,0.2)]">
              Enter Terminal
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#features" className="flex items-center justify-center gap-3 border border-[#1A2035] bg-[#0b0f19]/80 text-white font-mono text-sm uppercase tracking-widest px-8 py-4 hover:border-zinc-500 transition-all duration-300">
              Read Docs
            </a>
          </div>
        </section>

        {/* METRICS STRIP */}
        <section className="metrics-section border-y border-[#1A2035] bg-black/50 backdrop-blur-xl py-8">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-[#1A2035]">
              <div className="metric-card text-center px-4">
                <p className="text-3xl font-mono font-bold text-white mb-1">$0.00</p>
                <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Total Value Locked</p>
              </div>
              <div className="metric-card text-center px-4">
                <p className="text-3xl font-mono font-bold text-white mb-1">BN254</p>
                <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">ZK Curve Target</p>
              </div>
              <div className="metric-card text-center px-4">
                <p className="text-3xl font-mono font-bold text-white mb-1">~3s</p>
                <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Settlement Finality</p>
              </div>
              <div className="metric-card text-center px-4">
                <p className="text-3xl font-mono font-bold text-[#00ffcc] mb-1">100%</p>
                <p className="text-[10px] uppercase font-mono tracking-widest text-[#00ffcc]/50">Privacy Maintained</p>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="py-32 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-20">
              <KineticHeading text="Architected for Institutions" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="feature-card group border border-[#1A2035] bg-[#0b0f19]/40 p-10 hover:border-[#3b82f6]/50 transition-all duration-500 hover:bg-[#3b82f6]/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Lock className="w-24 h-24 text-[#3b82f6]" />
                </div>
                <Shield className="w-10 h-10 text-[#3b82f6] mb-6" />
                <h3 className="text-xl font-mono font-bold uppercase tracking-wider mb-4">Zero-Knowledge Privacy</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Generate Groth16 proofs client-side via WebAssembly. Prove collateral health metrics without revealing your underlying asset value, treasury allocations, or institutional identity to the public ledger.
                </p>
              </div>

              <div className="feature-card group border border-[#1A2035] bg-[#0b0f19]/40 p-10 hover:border-[#00ffcc]/50 transition-all duration-500 hover:bg-[#00ffcc]/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Zap className="w-24 h-24 text-[#00ffcc]" />
                </div>
                <Zap className="w-10 h-10 text-[#00ffcc] mb-6" />
                <h3 className="text-xl font-mono font-bold uppercase tracking-wider mb-4">Soroban Native Finality</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Built on Stellar's Soroban smart contract platform utilizing CAP-80 host primitives. On-chain ZK verification guarantees instantaneous execution of borrowing and lending logic.
                </p>
              </div>

              <div className="feature-card group border border-[#1A2035] bg-[#0b0f19]/40 p-10 hover:border-[#b582ff]/50 transition-all duration-500 hover:bg-[#b582ff]/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Database className="w-24 h-24 text-[#b582ff]" />
                </div>
                <BarChart3 className="w-10 h-10 text-[#b582ff] mb-6" />
                <h3 className="text-xl font-mono font-bold uppercase tracking-wider mb-4">Tokenized Collateral</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Support for strictly compliant SEP-41 tokenized real-world assets. Lend native XLM seamlessly against institutional bond tokens or yield-bearing digital treasuries safely and transparently.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section py-32 border-t border-[#1A2035]/50 bg-gradient-to-b from-[#030508] to-black">
          <div className="cta-content container mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-8">
              Ready to execute the future of Repo?
            </h2>
            <Link href="/terminal" className="inline-flex items-center justify-center gap-3 border border-[#00ffcc] bg-[#00ffcc] text-black font-mono text-sm font-bold uppercase tracking-widest px-12 py-5 hover:bg-transparent hover:text-[#00ffcc] transition-all duration-300 shadow-[0_0_40px_rgba(0,255,204,0.3)]">
              Launch Astra Terminal
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#1A2035] bg-black py-8">
          <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-4 h-4 rounded-full border border-[#00ffcc] flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-[#00ffcc]" />
              </div>
              <span className="font-mono text-xs tracking-widest uppercase font-bold text-white">Astra Repo Protocol</span>
            </div>
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
              © 2026 Astra Protocol. Built on Stellar Soroban.
            </p>
          </div>
        </footer>

      </div>
    </main>
  );
}
