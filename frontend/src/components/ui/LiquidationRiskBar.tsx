/** @feature LiquidationRiskBar - polls /api/v1/deals/:id/margin every 15s, color transitions green->amber->red based on margin ratio vs 150/120/100 thresholds */
'use client';
import React, { useState, useEffect } from 'react';

interface LiquidationRiskBarProps {
  dealId: number;
  maturityTimestamp?: number; // Unix seconds
}

function formatCountdown(maturityTimestamp?: number): string {
  if (!maturityTimestamp) return '';
  const now = Math.floor(Date.now() / 1000);
  const diff = maturityTimestamp - now;
  if (diff <= 0) return 'Eligible for liquidation';
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return `Liquidation eligible in ~${h}h ${m}m`;
}

function getRiskColor(ratio: number): { color: string; label: string; pulse: boolean } {
  if (ratio >= 150) return { color: '#22c55e', label: 'Safe', pulse: false };
  if (ratio >= 120) return { color: '#f59e0b', label: 'Monitor', pulse: false };
  if (ratio >= 100) return { color: '#ef4444', label: 'Danger', pulse: true };
  return { color: '#dc2626', label: 'Critical', pulse: true };
}

export default function LiquidationRiskBar({ dealId, maturityTimestamp }: LiquidationRiskBarProps) {
  const [marginRatio, setMarginRatio] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState('');

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://astra-9mg6.onrender.com';

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function fetchMargin() {
      try {
        const res = await fetch(`${backendUrl}/api/v1/deals/${dealId}/margin`);
        if (res.ok) {
          const data = await res.json();
          setMarginRatio(data.marginRatio);
        }
      } catch {}
      setLoading(false);
    }

    fetchMargin();
    interval = setInterval(fetchMargin, 15000);
    return () => clearInterval(interval);
  }, [dealId, backendUrl]);

  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(maturityTimestamp));
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, [maturityTimestamp]);

  if (loading) {
    return (
      <div style={{ fontFamily: 'monospace', color: '#00ffcc', fontSize: '12px', opacity: 0.6 }}>
        LOADING MARGIN RATIO...
      </div>
    );
  }

  if (marginRatio === null) return null;

  const { color, label, pulse } = getRiskColor(marginRatio);
  const barWidth = Math.min(100, (marginRatio / 200) * 100);

  return (
    <div style={{ width: '100%', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
        <span style={{ color: '#aaaaaa' }}>LIQUIDATION RISK</span>
        <span style={{ color, fontWeight: 700 }}>MARGIN RATIO: {marginRatio}% — {label.toUpperCase()}</span>
      </div>
      <div
        style={{
          width: '100%',
          height: '8px',
          background: '#1a1a2e',
          borderRadius: '4px',
          overflow: 'hidden',
          border: `1px solid ${color}33`,
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: '100%',
            background: color,
            borderRadius: '4px',
            transition: 'width 0.5s ease, background 0.5s ease',
            animation: pulse ? 'riskPulse 1s ease-in-out infinite' : undefined,
          }}
        />
      </div>
      {countdown && (
        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>{countdown}</div>
      )}
      <style>{`
        @keyframes riskPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
