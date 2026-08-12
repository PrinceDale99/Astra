/** @feature DealHistoryPage - paginated view of all on-chain deal events from SQLite deal_history table, supports type tabs and borrower address filter */
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, ShieldCheck, Search } from 'lucide-react';

interface ClosedDeal {
  id: string;
  deal_id: number | null;
  borrower: string;
  type: 'created' | 'repaid' | 'liquidated';
  deposited_xlm: number;
  issued_ylds: number | null;
  closed_at: string;
  ledger: number;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://astra-9mg6.onrender.com';

const PAGE_SIZE = 20;

const TYPE_TABS = [
  { key: 'all',        label: 'All',         color: '#00ffcc' },
  { key: 'created',    label: 'Created',      color: '#3b82f6' },
  { key: 'repaid',     label: 'Repaid',       color: '#22c55e' },
  { key: 'liquidated', label: 'Liquidated',   color: '#ef4444' },
] as const;

type FilterType = (typeof TYPE_TABS)[number]['key'];

const BADGE: Record<string, { bg: string; color: string; border: string }> = {
  created:    { bg: '#3b82f611', color: '#3b82f6', border: '#3b82f633' },
  repaid:     { bg: '#22c55e11', color: '#22c55e', border: '#22c55e33' },
  liquidated: { bg: '#ef444411', color: '#ef4444', border: '#ef444433' },
};

export default function HistoryPage() {
  const [deals, setDeals] = useState<ClosedDeal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [borrowerFilter, setBorrowerFilter] = useState('');
  const [borrowerInput, setBorrowerInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (filter !== 'all') params.set('type', filter);
      if (borrowerFilter.trim()) params.set('borrower', borrowerFilter.trim());

      const res = await fetch(`${API_URL}/api/v1/deals/history?${params}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setDeals(data.deals as ClosedDeal[]);
      setTotal(data.total ?? 0);
      setLastRefreshed(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, filter, borrowerFilter]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Auto-refresh every 30s to catch new events
  useEffect(() => {
    const id = setInterval(fetchHistory, 30000);
    return () => clearInterval(id);
  }, [fetchHistory]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="min-h-screen bg-[#030508] text-white font-mono">

      {/* Top gradient orb */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#00ffcc]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pt-16 pb-24">

        {/* Header */}
        <div className="mb-10">
          <Link
            href="/analytics"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-[#00ffcc] transition-colors text-xs uppercase tracking-widest mb-8 group"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
            Analytics
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-widest text-[#00ffcc] uppercase">
                Deal History
              </h1>
              <p className="text-zinc-600 text-xs mt-1 uppercase tracking-wider">
                All on-chain events — Stellar Testnet · Contract{' '}
                <span className="text-zinc-500">CDNDVK…UX5US</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/20 px-3 py-1 text-xs rounded-sm tracking-widest">
                {total.toLocaleString()} EVENTS
              </span>
              <button
                onClick={fetchHistory}
                disabled={loading}
                className="text-zinc-600 hover:text-[#00ffcc] transition-colors disabled:opacity-40"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Type tabs */}
          <div className="flex gap-1 border border-[#1a2035] p-1">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setFilter(tab.key); setPage(1); }}
                className="px-4 py-1.5 text-[11px] uppercase tracking-wider transition-all duration-200"
                style={{
                  background: filter === tab.key ? `${tab.color}18` : 'transparent',
                  color: filter === tab.key ? tab.color : '#555',
                  borderBottom: filter === tab.key ? `1px solid ${tab.color}` : '1px solid transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Borrower search */}
          <div className="flex flex-1 items-center border border-[#1a2035] bg-black/40 px-3 gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
            <input
              type="text"
              placeholder="Filter by wallet address G..."
              value={borrowerInput}
              onChange={(e) => setBorrowerInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { setBorrowerFilter(borrowerInput); setPage(1); }
              }}
              className="flex-1 bg-transparent text-zinc-400 text-xs py-2 outline-none placeholder:text-zinc-700"
            />
            {borrowerFilter && (
              <button
                onClick={() => { setBorrowerFilter(''); setBorrowerInput(''); setPage(1); }}
                className="text-zinc-600 hover:text-zinc-400 text-xs"
              >✕</button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="border border-[#1a2035] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1a2035] bg-[#050810]">
                  {['Deal #', 'Type', 'XLM Amount', 'YLDS Issued', 'Borrower', 'Date', 'Ledger', 'ZK'].map((h) => (
                    <th key={h} className="py-3 px-4 text-[10px] text-zinc-600 uppercase tracking-widest font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <RefreshCw className="w-5 h-5 animate-spin text-zinc-700 mx-auto mb-2" />
                      <p className="text-zinc-700 text-xs uppercase tracking-widest">Fetching chain data...</p>
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-red-500 text-xs uppercase tracking-wider">
                      ⚠ {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && deals.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <p className="text-zinc-700 text-sm uppercase tracking-widest mb-2">No records found</p>
                      <p className="text-zinc-800 text-xs">
                        {borrowerFilter
                          ? 'No events for this address yet'
                          : 'Waiting for on-chain events — indexer polls every 10s'}
                      </p>
                    </td>
                  </tr>
                )}
                {!loading && !error && deals.map((deal, i) => {
                  const badge = BADGE[deal.type] ?? BADGE.created;
                  return (
                    <tr
                      key={deal.id}
                      className="border-b border-[#0d1117] hover:bg-[#0a1628]/50 transition-colors"
                      style={{ background: i % 2 === 0 ? '#04060f' : '#000' }}
                    >
                      <td className="py-3 px-4 text-[#00ffcc] text-xs">
                        {deal.deal_id !== null ? `#${deal.deal_id}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border"
                          style={{ background: badge.bg, color: badge.color, borderColor: badge.border }}
                        >
                          {deal.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-300">
                        {deal.deposited_xlm.toFixed(4)} XLM
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-500">
                        {deal.issued_ylds !== null ? `${deal.issued_ylds.toFixed(4)} YLDS` : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-600 max-w-[140px]">
                        <span title={deal.borrower}>
                          {deal.borrower !== 'unknown'
                            ? `${deal.borrower.substring(0, 6)}…${deal.borrower.slice(-4)}`
                            : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-500">
                        {new Date(deal.closed_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-700">
                        {deal.ledger.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-[10px] text-green-500">
                          <ShieldCheck className="w-3 h-3" /> OK
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination + refresh stamp */}
        <div className="flex justify-between items-center mt-4 text-xs text-zinc-700">
          <span>
            Page {page} of {totalPages} · Refreshed {lastRefreshed.toLocaleTimeString()}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border border-[#1a2035] px-4 py-1.5 hover:border-[#00ffcc]/40 hover:text-[#00ffcc] transition-colors disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              ← Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border border-[#1a2035] px-4 py-1.5 hover:border-[#00ffcc]/40 hover:text-[#00ffcc] transition-colors disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              Next →
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}
