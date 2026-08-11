/** @feature RestoreDeal - prompts user to pay rent fee via Freighter to restore expired persistent deal entries, calls restore_deal() contract function */
'use client';
import React, { useState } from 'react';

interface RestoreDealButtonProps {
  dealId: number;
  onRestored?: () => void;
}

export default function RestoreDealButton({ dealId, onRestored }: RestoreDealButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://astra-9mg6.onrender.com';

  const handleRestore = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${backendUrl}/api/v1/deals/${dealId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');
      setSuccess(true);
      setOpen(false);
      onRestored?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ color: '#22c55e', fontFamily: 'monospace', fontSize: '12px' }}>
        ✓ CHAIN STATE RESTORED
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'transparent',
          border: '1px solid #f59e0b',
          color: '#f59e0b',
          padding: '6px 14px',
          fontFamily: 'monospace',
          fontSize: '12px',
          cursor: 'pointer',
          letterSpacing: '0.1em',
          borderRadius: '4px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f59e0b22')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        ⚠ RESTORE DEAL
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            style={{
              background: '#0d1117',
              border: '1px solid #f59e0b44',
              borderRadius: '8px',
              padding: '32px',
              maxWidth: '440px',
              width: '90%',
              fontFamily: 'monospace',
            }}
          >
            <div style={{ color: '#f59e0b', fontSize: '14px', marginBottom: '16px', letterSpacing: '0.15em' }}>
              ⚠ DEAL STATE ARCHIVED
            </div>
            <p style={{ color: '#aaaaaa', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>
              Deal #{dealId}'s on-chain state has been archived by the Soroban network due to TTL expiry.
              Restoring it requires a small rent fee in XLM, payable via Freighter.
            </p>
            {error && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '16px', padding: '8px', border: '1px solid #ef444444', borderRadius: '4px' }}>
                ERROR: {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleRestore}
                disabled={loading}
                style={{
                  flex: 1,
                  background: loading ? '#333' : '#f59e0b',
                  color: '#000',
                  border: 'none',
                  padding: '10px 0',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  borderRadius: '4px',
                  letterSpacing: '0.1em',
                }}
              >
                {loading ? 'RESTORING CHAIN STATE...' : 'CONFIRM & RESTORE'}
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #333',
                  color: '#666',
                  padding: '10px 20px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
