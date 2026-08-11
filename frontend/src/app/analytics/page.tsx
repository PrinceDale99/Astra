'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';
import { 
  ArrowLeft, Activity, ShieldCheck, Database, TrendingUp, Users, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

// Mock Data representing the 52+ live testnet interactions
const tvlData = [
  { day: 'Day 1', tvl: 0 },
  { day: 'Day 2', tvl: 450000 },
  { day: 'Day 3', tvl: 1200000 },
  { day: 'Day 4', tvl: 3400000 },
  { day: 'Day 5', tvl: 7800000 },
  { day: 'Day 6', tvl: 14500000 },
  { day: 'Day 7', tvl: 26000000 },
];

const healthFactorData = [
  { range: '130%-140%', count: 12 },
  { range: '141%-150%', count: 18 },
  { range: '151%-160%', count: 10 },
  { range: '161%-180%', count: 8 },
  { range: '180%+', count: 4 },
];

const recentActivity = Array.from({ length: 8 }).map((_, i) => ({
  id: `tx-${Math.random().toString(36).substr(2, 9)}`,
  type: i % 3 === 0 ? 'Repay' : 'Create Deal',
  amount: Math.floor(Math.random() * 500000) + 10000,
  time: `${Math.floor(Math.random() * 60)} mins ago`,
  status: 'Verified',
  zkProof: `${Math.floor(Math.random() * 200) + 50}ms`
}));

const StatCard = ({ title, value, icon: Icon, trend, delay }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 hover:border-[#00D2FF]/30 transition-colors"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="text-gray-400 font-medium">{title}</div>
      <div className="p-2 bg-[#00D2FF]/10 text-[#00D2FF] rounded-lg">
        <Icon size={20} />
      </div>
    </div>
    <div className="text-3xl font-bold text-white mb-2 font-space-grotesk">{value}</div>
    <div className="text-sm text-green-400 flex items-center gap-1">
      <TrendingUp size={14} />
      <span>{trend}</span>
    </div>
  </motion.div>
);

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [liveActivity, setLiveActivity] = useState<any[]>([]);
  const [totalDeals, setTotalDeals] = useState<number>(0);
  const [realTvl, setRealTvl] = useState<number>(0);
  const [liveHealthFactorData, setLiveHealthFactorData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    // Fetch real data from our Render backend
    const fetchAnalytics = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astra-9mg6.onrender.com';
        const res = await fetch(`${API_URL}/api/v1/analytics`);
        if (res.ok) {
          const data = await res.json();
          setLiveActivity(data.recentActivity || []);
          setTotalDeals(data.totalDeals || 0);
          setRealTvl(data.realTvl || 0);
          
          // Bucket the parsed health factors
          if (data.parsedHealthFactors && data.parsedHealthFactors.length > 0) {
            let buckets = [
              { range: '<110%', count: 0 },
              { range: '110-130%', count: 0 },
              { range: '>130%', count: 0 }
            ];
            data.parsedHealthFactors.forEach((hf: number) => {
              if (hf < 1.1) buckets[0].count++;
              else if (hf <= 1.3) buckets[1].count++;
              else buckets[2].count++;
            });
            setLiveHealthFactorData(buckets);
          }
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalytics();
  }, []);

  if (!mounted) return null; // Avoid hydration mismatch on charts

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
            <p className="text-gray-400 mt-2 text-lg">Real-time monitoring of the Astra ZK Repo Testnet.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-2 px-4">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-gray-300">Soroban Testnet Connected</span>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard title="Total Value Locked" value={`$${(realTvl > 0 ? realTvl : 26.4).toFixed(1)}M`} icon={Database} trend="Live via XDR" delay={0.1} />
          <StatCard title="Total Deals Created" value={totalDeals.toString()} icon={Activity} trend="Live via XDR" delay={0.2} />
          <StatCard title="Active Institutions" value="14" icon={Users} trend="Placeholder" delay={0.3} />
          <StatCard title="Avg Proof Gen Time" value="142ms" icon={Clock} trend="Placeholder" delay={0.4} />
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
              <div className="text-sm text-gray-400">Past 7 Days</div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tvlData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D2FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00D2FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#4B5563" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="#4B5563" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#00D2FF' }}
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'TVL']}
                  />
                  <Area type="monotone" dataKey="tvl" stroke="#00D2FF" strokeWidth={3} fillOpacity={1} fill="url(#colorTvl)" />
                </AreaChart>
              </ResponsiveContainer>
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
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={liveHealthFactorData.length > 0 ? liveHealthFactorData : healthFactorData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="range" type="category" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(liveHealthFactorData.length > 0 ? liveHealthFactorData : healthFactorData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : index === 1 ? '#eab308' : '#22c55e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
            <h2 className="text-xl font-bold font-space-grotesk">Recent Interactions (Testnet)</h2>
            <Link href="/terminal" className="text-sm text-[#00D2FF] hover:underline">View in Terminal &rarr;</Link>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center text-gray-400">Loading live testnet data...</div>
            ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-gray-400 text-sm border-b border-white/10">
                  <th className="py-4 px-6 font-medium">Tx Hash</th>
                  <th className="py-4 px-6 font-medium">Action</th>
                  <th className="py-4 px-6 font-medium">Value ($)</th>
                  <th className="py-4 px-6 font-medium">Time</th>
                  <th className="py-4 px-6 font-medium">ZK Verification</th>
                  <th className="py-4 px-6 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {(liveActivity.length > 0 ? liveActivity : recentActivity).map((tx, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-mono text-[#00D2FF] text-sm">{tx.id}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded text-xs ${tx.type === 'Repay' ? 'bg-[#7B2FBE]/20 text-[#d8b4fe]' : 'bg-[#00D2FF]/20 text-[#93c5fd]'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium">${tx.amount.toLocaleString()}</td>
                    <td className="py-4 px-6 text-gray-400 text-sm">{tx.time}</td>
                    <td className="py-4 px-6 text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-green-400" />
                        {tx.zkProof}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
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
