"use client";

import React, { useState } from "react";
import { AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";
import { type SubscriptionCardData } from "@/components/SubscriptionCard";
import { formatBdt } from "@/lib/subscriptions";

interface RenewalBannerProps {
  subscriptions: SubscriptionCardData[];
  walletBalance: number;
}

export function RenewalBanner({ subscriptions, walletBalance }: RenewalBannerProps) {
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Find active subscriptions expiring in <= 5 days
  const now = new Date();
  const expiringSoon = subscriptions.filter((sub) => {
    if (sub.status !== "active" || !sub.expiry_date) return false;
    const exp = new Date(sub.expiry_date);
    const diffDays = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return diffDays >= -1 && diffDays <= 5;
  });

  if (expiringSoon.length === 0) return null;

  const handleRenew = async (subId: string) => {
    try {
      setRenewingId(subId);
      setMessage(null);
      const res = await fetch("/api/subscriptions/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_id: subId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: "success",
          text: "Subscription renewed successfully! Expiration date extended.",
        });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to renew subscription." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to process renewal." });
    } finally {
      setRenewingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              : "bg-red-500/10 text-red-400 border border-red-500/30"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {expiringSoon.map((sub) => (
        <div
          key={sub.id}
          className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-[#161922] to-[#161922] p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                  Expiring Soon (In 5 days or less)
                </span>
              </div>
              <h4 className="text-base font-black text-white mt-0.5">{sub.planName || sub.productName}</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Wallet Balance: <span className="font-bold text-emerald-400">{formatBdt(walletBalance)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => handleRenew(sub.id)}
            disabled={renewingId === sub.id}
            className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-5 py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer self-start sm:self-auto shrink-0"
          >
            {renewingId === sub.id ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            1-Click Renew with Wallet →
          </button>
        </div>
      ))}
    </div>
  );
}
