'use client';
import React from 'react';

export default function VaultScenePlaceholder() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        background: 'radial-gradient(ellipse at center, #0a1628 0%, #000000 70%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes vaultPulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.04); }
        }
        @keyframes vaultRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes vaultSpin {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .vault-ring-1 { animation: vaultPulse 4s ease-in-out infinite; }
        .vault-ring-2 { animation: vaultPulse 4s ease-in-out infinite 1s; }
        .vault-ring-3 { animation: vaultPulse 4s ease-in-out infinite 2s; }
        .vault-rotate { animation: vaultRotate 20s linear infinite; }
        .vault-spin { animation: vaultSpin 15s linear infinite; }
        .vault-label {
          animation: vaultPulse 3s ease-in-out infinite;
          font-family: 'Courier New', monospace;
          color: #00ffcc;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-align: center;
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
        }
      `}</style>

      {/* Concentric hexagonal rings */}
      <svg
        width="320"
        height="320"
        viewBox="0 0 320 320"
        style={{ position: 'absolute' }}
      >
        {/* Outer ring */}
        <polygon
          className="vault-ring-1 vault-rotate"
          points="160,20 287,90 287,230 160,300 33,230 33,90"
          fill="none"
          stroke="#00ffcc"
          strokeWidth="1"
          strokeOpacity="0.3"
          style={{ transformOrigin: '160px 160px' }}
        />
        {/* Middle ring */}
        <polygon
          className="vault-ring-2 vault-spin"
          points="160,55 254,108 254,212 160,265 66,212 66,108"
          fill="none"
          stroke="#00ffcc"
          strokeWidth="1.5"
          strokeOpacity="0.5"
          style={{ transformOrigin: '160px 160px' }}
        />
        {/* Inner ring */}
        <polygon
          className="vault-ring-3 vault-rotate"
          points="160,90 221,125 221,195 160,230 99,195 99,125"
          fill="none"
          stroke="#00ffcc"
          strokeWidth="2"
          strokeOpacity="0.7"
          style={{ transformOrigin: '160px 160px' }}
        />
        {/* Center dot */}
        <circle cx="160" cy="160" r="6" fill="#00ffcc" opacity="0.8" />
        {/* Cross hairs */}
        <line x1="160" y1="140" x2="160" y2="130" stroke="#00ffcc" strokeWidth="1" opacity="0.5" />
        <line x1="160" y1="180" x2="160" y2="190" stroke="#00ffcc" strokeWidth="1" opacity="0.5" />
        <line x1="140" y1="160" x2="130" y2="160" stroke="#00ffcc" strokeWidth="1" opacity="0.5" />
        <line x1="180" y1="160" x2="190" y2="160" stroke="#00ffcc" strokeWidth="1" opacity="0.5" />
      </svg>

      <div className="vault-label">LITE MODE ACTIVE — 3D CANVAS SUSPENDED</div>
    </div>
  );
}
