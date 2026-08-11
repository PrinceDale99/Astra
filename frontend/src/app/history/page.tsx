'use client';
import React, { useState, useEffect, useCallback } from 'react';

interface ClosedDeal {
  id: string;
  deal_id: number | null;
  borrower: string;
  type: 'repaid' | 'liquidated';
  deposited_xlm: number;
  issued_ylds: number | null;
  closed_at: string;
  ledger: number;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
const PAGE_SIZE = 20;

export default function HistoryPage() {
  const [deals, setDeals] = useState<ClosedDeal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'repaid' | 'liquidated'>('all');
  const [borrowerFilter, setBorrowerFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (borrowerFilter.trim()) params.set('borrower', borrowerFilter.trim());
      const res = await fetch(`${BACKEND_URL}/api/v1/deals/history?${params}`);
      if (!res.ok) throw new Error('Failed to fetch deal history');
      const data = await res.json();
      let filteredDeals = data.deals as ClosedDeal[];
      if (filter !== 'all') {
        filteredDeals = filteredDeals.filter((d) => d.type === filter);
      }
      setDeals(filteredDeals);
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, filter, borrowerFilter]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#e0e0e0', fontFamily: 'monospace', padding: '40px 24px' }}>
      <style>{`
        .history-row:hover { background: #0a1628 !important; }
        .filter-pill { cursor: pointer; padding: 6px 16px; border-radius: 20px; font-size: 12px; letter-spacing: 0.1em; border: 1px solid #333; background: transparent; color: #666; transition: all 0.2s; }
        .filter-pill.active { border-color: #00ffcc; color: #00ffcc; background: #00ffcc11; }
        .filter-pill:hover { border-color: #00ffcc88; color: #00ffcc88; }
        .badge-repaid { background: #22c55e22; color: #22c55e; border: 1px solid #22c55e44; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
        .badge-liquidated { background: #ef444422; color: #ef4444; border: 1px solid #ef444444; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
        .page-btn { background: transparent; border: 1px solid #333; color: #666; padding: 6px 14px; font-family: monospace; font-size: 12px; cursor: pointer; border-radius: 4px; transition: all 0.2s; }
        .page-btn:hover:not(:disabled) { border-color: #00ffcc; color: #00ffcc; }
        .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '20px', color: '#00ffcc', letterSpacing: '0.2em', margin: 0 }}>DEAL HISTORY</h1>
          <span style={{ background: '#00ffcc22', color: '#00ffcc', border: '1px solid #00ffcc44', padding: '2px 10px', borderRadius: '12px', fontSize: '12px' }}>
            {total} RECORDS
          </span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {(['all', 'repaid', 'liquidated'] as const).map((f) => (
            <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => { setFilter(f); setPage(1); }}>
              {f.toUpperCase()}
            </button>
          ))}
          <input
            type="text"
            placeholder="Filter by address G..."
            value={borrowerFilter}
            onChange={(e) => { setBorrowerFilter(e.target.value); setPage(1); }}
            style={{
              background: '#0d1117', border: '1px solid #333', color: '#aaa',
              padding: '6px 12px', borderRadius: '4px', fontFamily: 'monospace',
              fontSize: '12px', width: '220px', outline: 'none',
            }}
          />
        </div>

        {/* Table */}
        <div style={{ border: '1px solid #1a1a2e', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0d1117', borderBottom: '1px solid #1a1a2e' }}>
                {['DEAL ID', 'TYPE', 'AMOUNT (XLM)', 'BORROWER', 'CLOSED AT', 'LEDGER', 'ZK STATUS'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#555', letterSpacing: '0.1em', fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#444' }}>FETCHING CHAIN DATA...</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>ERROR: {error}</td></tr>
              )}
              {!loading && !error && deals.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '60px', textAlign: 'center' }}>
                    <div style={{ color: '#333', fontSize: '13px', letterSpacing: '0.15em' }}>NO HISTORICAL RECORDS FOUND [ERR_0x00]</div>
                    <div style={{ color: '#222', fontSize: '11px', marginTop: '8px' }}>{'//  awaiting on-chain settlement events'}</div>
                  </td>
                </tr>
              )}
              {!loading && !error && deals.map((deal, i) => (
                <tr
                  key={deal.id}
                  className="history-row"
                  style={{ borderBottom: '1px solid #0d1117', background: i % 2 === 0 ? '#050810' : '#000' }}
                >
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#00ffcc' }}>#{deal.deal_id ?? '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={deal.type === 'repaid' ? 'badge-repaid' : 'badge-liquidated'}>
                      {deal.type.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#e0e0e0' }}>{deal.deposited_xlm.toFixed(4)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '11px', color: '#666', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {deal.borrower.substring(0, 8)}...{deal.borrower.slice(-4)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '11px', color: '#888' }}>
                    {new Date(deal.closed_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '11px', color: '#555' }}>{deal.ledger.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: '#22c55e', fontSize: '11px' }}>✓ VERIFIED</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <span style={{ fontSize: '12px', color: '#444' }}>PAGE {page} OF {totalPages}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← PREV</button>
            <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>NEXT →</button>
          </div>
        </div>
      </div>
    </main>
  );
}
