"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function BackendWakeup() {
  const [isAwake, setIsAwake] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const checkHealth = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const res = await fetch(`${API_URL}/healthz`, { cache: 'no-store' });
        
        if (res.ok) {
          if (isMounted) setIsAwake(true);
        } else {
          if (isMounted) setIsAwake(false);
        }
      } catch (err) {
        if (isMounted) setIsAwake(false);
      }
    };

    checkHealth();

    // Poll every 3 seconds if not awake
    const interval = setInterval(() => {
      if (isAwake !== true) {
        checkHealth();
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAwake]);

  // If we know it's awake, render nothing
  if (isAwake === true) return null;

  // Render a fixed futuristic overlay if we haven't confirmed it's awake yet.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="flex flex-col items-center border border-[#1A2035] bg-[#0b0f19] p-8 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute inset-0 bg-[#00ffcc]/5 blur-[60px]" />

        <Loader2 className="w-12 h-12 text-[#00ffcc] animate-spin mb-6 relative z-10" />
        
        <h2 className="text-xl font-mono font-bold uppercase tracking-widest text-white mb-3 text-center relative z-10">
          Orchestration Engine Sleep Mode
        </h2>
        
        <p className="text-sm font-mono text-zinc-400 text-center leading-relaxed relative z-10">
          The Layer 3 Render backend is currently waking up from its free-tier slumber. 
          This usually takes <span className="text-[#00ffcc]">30-50 seconds</span>. 
          <br /><br />
          Please standby...
        </p>
        
        <div className="w-full h-1 bg-[#1A2035] mt-6 relative overflow-hidden z-10">
          <div className="absolute top-0 left-0 h-full bg-[#00ffcc] w-1/3 animate-[pulse_2s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}
