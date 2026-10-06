"use client";

import React, { useEffect, useState } from "react";
import { Gift, Copy, Check, Users, DollarSign } from "lucide-react";
import { formatBdt } from "@/lib/subscriptions";

export function ReferralDashboardCard() {
  const [stats, setStats] = useState<{
    referral_code: string;
    referral_link: string;
    referred_count: number;
    total_earned: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReferralStats() {
      try {
        const res = await fetch("/api/referrals/stats");
        const data = await res.json();
        if (res.ok && data.success) {
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to load referral stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReferralStats();
  }, []);

  const copyReferralLink = () => {
    if (!stats?.referral_link) return;
    navigator.clipboard.writeText(stats.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !stats) return null;

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#161922] via-[#141722] to-purple-950/20 p-6 shadow-xl text-white space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
            <Gift className="w-4 h-4 text-purple-400" /> Refer & Earn 5% Cashback
          </div>
          <h3 className="text-lg font-bold text-white mt-1">Share your link, earn on every friend's purchase!</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Share your unique referral link with friends. Get 5% cashback credited directly to your wallet.
          </p>
        </div>

        <div className="flex items-center gap-6 bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl">
          <div>
            <span className="text-[10px] text-neutral-400 font-bold uppercase block">Referred Friends</span>
            <span className="text-base font-black text-purple-300 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {stats.referred_count}
            </span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <span className="text-[10px] text-neutral-400 font-bold uppercase block">Total Earned</span>
            <span className="text-base font-black text-emerald-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" /> {formatBdt(stats.total_earned)}
            </span>
          </div>
        </div>
      </div>

      {/* Referral Link Copy Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 flex items-center justify-between font-mono text-xs text-neutral-200 truncate">
          <span className="truncate">{stats.referral_link}</span>
          <span className="ml-2 text-[10px] font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 uppercase">
            Code: {stats.referral_code}
          </span>
        </div>
        <button
          onClick={copyReferralLink}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          {copied ? "Link Copied!" : "Copy Referral Link"}
        </button>
      </div>
    </div>
  );
}
