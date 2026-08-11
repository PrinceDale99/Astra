'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface LiteModeContextValue {
  isLiteMode: boolean;
  toggleLiteMode: () => void;
}

const LiteModeContext = createContext<LiteModeContextValue>({
  isLiteMode: false,
  toggleLiteMode: () => {},
});

export function LiteModeProvider({ children }: { children: React.ReactNode }) {
  const prefersReduced = useReducedMotion();
  const [isLiteMode, setIsLiteMode] = useState(false);

  useEffect(() => {
    // Load from localStorage, fall back to OS preference
    const stored = localStorage.getItem('astra_lite_mode');
    if (stored !== null) {
      setIsLiteMode(stored === 'true');
    } else {
      setIsLiteMode(prefersReduced);
    }
  }, [prefersReduced]);

  const toggleLiteMode = () => {
    setIsLiteMode((prev) => {
      const next = !prev;
      localStorage.setItem('astra_lite_mode', String(next));
      return next;
    });
  };

  return (
    <LiteModeContext.Provider value={{ isLiteMode, toggleLiteMode }}>
      {children}
    </LiteModeContext.Provider>
  );
}

export function useLiteMode() {
  return useContext(LiteModeContext);
}
