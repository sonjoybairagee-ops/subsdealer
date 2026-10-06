"use client";

import React, { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Users, ShoppingBag, Gift, RefreshCw, Calendar } from "lucide-react";
import { formatBdt } from "@/lib/subscriptions";

interface AnalyticsStats {
  gross_sales: number;
  product_costs: number;
  orders_count: number;
  referral_payouts: number;
  net_profit: number;
  active_subscribers: number;
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = async (selectedRange: string) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/admin/analytics?range=${selectedRange}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setStats(data.stats);
        setRecentOrders(data.recentOrders || []);
      } else {
        setError(data.error || "Failed to load financial analytics.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong fetching analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(range);
  }, [range]);

  return (
    <div className="space-y-8 font-sans text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Financial Overview</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">Admin Financial & Profit Analytics</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Track gross sales, product costs, referral payouts, and net profit in real-time.
          </p>
        </div>

        {/* Date Range Filter Selector */}
        <div className="flex items-center gap-2 bg-[#161922] border border-white/10 p-1.5 rounded-xl self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-neutral-400 ml-2" />
          <button
            onClick={() => setRange("7d")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              range === "7d" ? "bg-[#e5243b] text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setRange("30d")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              range === "30d" ? "bg-[#e5243b] text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setRange("all")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              range === "all" ? "bg-[#e5243b] text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Financial Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gross Sales */}
        <div className="rounded-2xl border border-white/10 bg-[#161922] p-5 space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-neutral-400">Gross Sales</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white">
            {loading ? "..." : formatBdt(stats?.gross_sales || 0)}
          </h3>
          <p className="text-[11px] text-neutral-400">Total revenue from approved orders</p>
        </div>

        {/* Net Profit */}
        <div className="rounded-2xl border border-[#e5243b]/30 bg-gradient-to-br from-[#161922] to-red-950/20 p-5 space-y-2 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-red-400">Net Profit</span>
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white">
            {loading ? "..." : formatBdt(stats?.net_profit || 0)}
          </h3>
          <p className="text-[11px] text-neutral-400">Gross − Costs − Referral Cashback</p>
        </div>

        {/* Active Subscribers */}
        <div className="rounded-2xl border border-white/10 bg-[#161922] p-5 space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-neutral-400">Active Subscribers</span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white">
            {loading ? "..." : stats?.active_subscribers || 0}
          </h3>
          <p className="text-[11px] text-neutral-400">Users with non-expired subscriptions</p>
        </div>

        {/* Referral Cashback Paid */}
        <div className="rounded-2xl border border-white/10 bg-[#161922] p-5 space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-neutral-400">Referral Payouts</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Gift className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white">
            {loading ? "..." : formatBdt(stats?.referral_payouts || 0)}
          </h3>
          <p className="text-[11px] text-neutral-400">Total 5% cashback paid to referrers</p>
        </div>
      </div>

      {/* Orders & Breakdown Section */}
      <div className="rounded-2xl border border-white/10 bg-[#161922] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-red-500" /> Recent Approved Revenue Orders
          </h3>
          <button
            onClick={() => fetchAnalytics(range)}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-xs text-neutral-500 italic py-4 text-center">No recent approved orders in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-black/40 text-[10px] uppercase font-bold text-neutral-400 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-neutral-200">{ord.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3">{new Date(ord.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-bold text-emerald-400">{formatBdt(ord.amount_bdt || ord.amount || 0)}</td>
                    <td className="px-4 py-3">
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
