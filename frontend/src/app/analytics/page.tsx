'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';
import {
  ArrowLeft, Activity, ShieldCheck, Database, TrendingUp, Users, Clock, History, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRealtimeDeals } from '../../hooks/useRealtimeDeals';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://astra-9mg6.onrender.com';

const StatCard = ({ title, value, icon: Icon, sub, delay, loading }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 hover:border-[#00D2FF]/30 transition-colors"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="text-gray-400 font-medium text-sm">{title}</div>
      <div className="p-2 bg-[#00D2FF]/10 text-[#00D2FF] rounded-lg">
        <Icon size={18} />
      </div>
    </div>
    {loading ? (
      <div className="h-9 w-24 bg-white/5 rounded animate-pulse mb-2" />
    ) : (
      <div className="text-3xl font-bold text-white mb-1 font-space-grotesk">{value}</div>
    )}
    <div className="text-xs text-gray-500 flex items-center gap-1">
      <Clock size={11} />
      <span>{sub}</span>
    </div>
  </motion.div>
);

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [liveActivity, setLiveActivity] = useState<any[]>([]);
  const [totalDeals, setTotalDeals] = useState<number>(0);
  const [realTvl, setRealTvl] = useState<number>(0);
  const [liveHealthFactorData, setLiveHealthFactorData] = useState<any[]>([]);
  const [liveTvlData, setLiveTvlData] = useState<any[]>([]);
  const [activeInstitutions, setActiveInstitutions] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const { deals: wsDeals, isLive } = useRealtimeDeals();

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/analytics`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setLiveActivity(data.recentActivity || []);
      setTotalDeals(data.totalDeals ?? 0);
      setRealTvl(data.realTvl ?? 0);
      setActiveInstitutions(data.activeInstitutions ?? 0);
      setLastRefreshed(new Date());

      if (data.historicalTvl?.length > 0) {
        setLiveTvlData(data.historicalTvl);
      }

      if (data.parsedHealthFactors?.length > 0) {
        const buckets = [
          { range: '<110%', count: 0 },
          { range: '110–130%', count: 0 },
          { range: '>130%', count: 0 },
        ];
        data.parsedHealthFactors.forEach((hf: number) => {
          if (hf < 1.1) buckets[0].count++;
          else if (hf <= 1.3) buckets[1].count++;
          else buckets[2].count++;
        });
        setLiveHealthFactorData(buckets);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(id);
  }, [fetchAnalytics]);

  // Merge WebSocket live deals into the activity table
  useEffect(() => {
    if (wsDeals.length === 0) return;
    setLiveActivity((prev) => {
      const incoming = wsDeals.map((d) => ({
        id: d.id.substring(0, 12) + '...',
        type: d.type,
        amount: d.amount,
        time: new Date(d.time).toLocaleString(),
        status: d.status,
        zkProof: d.zkProof,
      }));
      // Merge without duplicates (by truncated id prefix)
      const existing = new Set(prev.map((x: any) => x.id));
      const fresh = incoming.filter((x) => !existing.has(x.id));
      if (fresh.length === 0) return prev;
      setTotalDeals((t) => t + fresh.length);
      return [...fresh, ...prev].slice(0, 50);
    });
  }, [wsDeals]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white pt-24 pb-20 px-6 sm:px-12 relative overflow-hidden">

      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#00D2FF]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#7B2FBE]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>Back to Home</span>
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold font-space-grotesk bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Protocol Analytics
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              Real-time monitoring of the Astra ZK Repo Testnet.
              {lastRefreshed && (
                <span className="ml-2 text-gray-600 text-xs">
                  Last updated: {lastRefreshed.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live / connecting indicator */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2 px-4">
              <span className="flex h-3 w-3 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLive ? 'bg-green-400' : 'bg-yellow-400'} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isLive ? 'bg-green-500' : 'bg-yellow-500'}`} />
              </span>
              <span className="text-sm font-medium text-gray-300">
                {isLive ? '● LIVE' : 'Connecting…'}
              </span>
            </div>

            {/* Manual refresh */}
            <button
              onClick={() => { setIsLoading(true); fetchAnalytics(); }}
              disabled={isLoading}
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2 px-4 text-sm text-gray-300 hover:border-[#00D2FF]/50 hover:text-white transition-colors disabled:opacity-40"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>

            <Link
              href="/history"
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2 px-4 text-sm text-gray-300 hover:border-[#00D2FF]/50 hover:text-white transition-colors"
            >
              <History size={14} />
              Deal History
            </Link>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard title="Total Value Locked" value={isLoading ? '—' : `${realTvl.toFixed(2)} XLM`} icon={Database} sub="Live via Soroban indexer" delay={0.1} loading={isLoading} />
          <StatCard title="Total Deals Indexed" value={isLoading ? '—' : totalDeals.toLocaleString()} icon={Activity} sub="All on-chain events" delay={0.2} loading={isLoading} />
          <StatCard title="Active Institutions" value={isLoading ? '—' : activeInstitutions.toLocaleString()} icon={Users} sub="Unique borrower addresses" delay={0.3} loading={isLoading} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">

          {/* TVL Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="lg:col-span-2 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-space-grotesk">Liquidity Growth (TVL)</h2>
              <div className="text-xs text-gray-500">Past 7 Days</div>
            </div>
            <div className="h-[280px] w-full flex items-center justify-center">
              {isLoading ? (
                <div className="w-full h-full bg-white/[0.02] rounded-xl animate-pulse" />
              ) : liveTvlData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={liveTvlData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00D2FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00D2FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" stroke="#4B5563" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#4B5563" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Number(v).toFixed(1)}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                      itemStyle={{ color: '#00D2FF' }}
                      formatter={(value: any) => [`${Number(value).toLocaleString()} XLM`, 'TVL']}
                    />
                    <Area type="monotone" dataKey="tvl" stroke="#00D2FF" strokeWidth={2} fillOpacity={1} fill="url(#colorTvl)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center">
                  <TrendingUp size={32} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">No TVL data yet</p>
                  <p className="text-gray-700 text-xs mt-1">Data populates as deals are indexed</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Health Factor Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold font-space-grotesk mb-6">Health Factor Distribution</h2>
            <div className="h-[280px] w-full flex items-center justify-center">
              {isLoading ? (
                <div className="w-full h-full bg-white/[0.02] rounded-xl animate-pulse" />
              ) : liveHealthFactorData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={liveHealthFactorData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="range" type="category" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} width={80} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {liveHealthFactorData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : index === 1 ? '#eab308' : '#22c55e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center">
                  <ShieldCheck size={32} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">No deals with health factors yet</p>
                </div>
              )}
            </div>
          </motion.div>

        </div>

        {/* Recent Transactions Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold font-space-grotesk">Recent On-Chain Activity</h2>
              <p className="text-gray-500 text-xs mt-0.5">Sourced from Soroban XDR · auto-refreshes every 30s</p>
            </div>
            <Link href="/history" className="text-sm text-[#00D2FF] hover:underline flex items-center gap-1">
              Full History →
            </Link>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center text-gray-500 text-sm">Loading live testnet data…</div>
            ) : liveActivity.length === 0 ? (
              <div className="p-16 text-center">
                <Activity size={32} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No transactions indexed yet</p>
                <p className="text-gray-700 text-xs mt-1">
                  Execute a deal on the{' '}
                  <Link href="/" className="text-[#00D2FF] hover:underline">Repo Terminal</Link>
                  {' '}— it will appear here within 10 seconds
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03] text-gray-500 text-xs border-b border-white/10">
                    <th className="py-4 px-6 font-medium uppercase tracking-wider">Tx ID</th>
                    <th className="py-4 px-6 font-medium uppercase tracking-wider">Action</th>
                    <th className="py-4 px-6 font-medium uppercase tracking-wider">Amount (XLM)</th>
                    <th className="py-4 px-6 font-medium uppercase tracking-wider">Time</th>
                    <th className="py-4 px-6 font-medium uppercase tracking-wider">ZK Proof</th>
                    <th className="py-4 px-6 font-medium uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {liveActivity.map((tx, idx) => (
                    <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-6 font-mono text-[#00D2FF] text-xs">{tx.id}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded text-xs ${
                          tx.type === 'Repay' ? 'bg-[#7B2FBE]/20 text-[#d8b4fe]'
                          : tx.type === 'Liquidation' ? 'bg-red-900/20 text-red-400'
                          : 'bg-[#00D2FF]/10 text-[#93c5fd]'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-medium text-sm">
                        {typeof tx.amount === 'number' ? tx.amount.toLocaleString(undefined, { maximumFractionDigits: 4 }) : tx.amount}
                      </td>
                      <td className="py-4 px-6 text-gray-400 text-xs">{tx.time}</td>
                      <td className="py-4 px-6 text-xs text-gray-300">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={14} className="text-green-400 flex-shrink-0" />
                          {tx.zkProof}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
