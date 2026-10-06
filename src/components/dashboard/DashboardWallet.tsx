"use client";

import { useState } from "react";
import { formatBdt, formatDhakaDate } from "@/lib/subscriptions";

interface WalletTransaction {
  id: string;
  amount_bdt: number;
  type: "topup" | "purchase" | "refund" | "admin_adjustment";
  balance_after: number;
  method: string;
  sender_number?: string | null;
  txn_ref?: string | null;
  status: "pending" | "approved" | "rejected";
  reject_reason?: string | null;
  created_at: string;
}

interface DashboardWalletProps {
  balance: number;
  transactions: WalletTransaction[];
}

export function DashboardWallet({ balance, transactions }: DashboardWalletProps) {
  const [activeSubTab, setActiveSubTab] = useState<"home" | "topup" | "topup_txns" | "txns">("home");
  const [amountBdt, setAmountBdt] = useState<string>("500");
  const [method, setMethod] = useState<"bkash" | "nagad">("bkash");
  const [senderNumber, setSenderNumber] = useState<string>("");
  const [txnRef, setTxnRef] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const topupPaymentDetails = {
    bkash: {
      type: "bKash Personal (Send Money)",
      number: "01922577297",
      instruction: "Send Money to this bKash number, then enter your sender number & TrxID below.",
    },
    nagad: {
      type: "Nagad Personal (Send Money)",
      number: "01922577297",
      instruction: "Send Money to this Nagad number, then enter your sender number & TrxID below.",
    },
  };

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const numAmount = Number(amountBdt);
      if (isNaN(numAmount) || numAmount < 50 || numAmount > 50000) {
        throw new Error("Amount must be between 50 BDT and 50,000 BDT");
      }
      if (!senderNumber.trim()) {
        throw new Error("Please enter your sender mobile number");
      }
      if (!txnRef.trim() || txnRef.trim().length < 6) {
        throw new Error("Please enter a valid Transaction ID (TrxID)");
      }

      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountBdt: numAmount,
          method,
          senderNumber: senderNumber.trim(),
          txnRef: txnRef.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit top-up request");
      }

      setSuccessMsg("Top-up request submitted successfully! We will verify your transaction shortly.");
      setSenderNumber("");
      setTxnRef("");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const topupTxns = transactions.filter((t) => t.type === "topup");

  return (
    <div className="space-y-6">
      {/* Top Yellow Banner (Matching Image 3) */}
      <div className="rounded-2xl bg-gradient-to-r from-[#ffb703] to-[#fb8500] p-6 sm:p-8 text-[#0d0f14] shadow-xl">
        <p className="text-xs font-black uppercase tracking-wider opacity-80">YOUR SUBSDEALER ACCOUNT</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">My Wallet</h1>
        <p className="mt-2 text-xs font-semibold opacity-90 sm:text-sm">
          Check your balance, add funds in BDT, and review recent wallet activity.
        </p>
      </div>

      {/* Navigation Sub-tabs (Matching Image 3) */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-[#161922] p-2">
        <button
          onClick={() => setActiveSubTab("home")}
          className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
            activeSubTab === "home"
              ? "bg-[#ffb703] text-[#0d0f14]"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          Home
        </button>
        <button
          onClick={() => setActiveSubTab("topup")}
          className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
            activeSubTab === "topup"
              ? "bg-[#ffb703] text-[#0d0f14]"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          Wallet Topup
        </button>
        <button
          onClick={() => setActiveSubTab("topup_txns")}
          className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
            activeSubTab === "topup_txns"
              ? "bg-[#ffb703] text-[#0d0f14]"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          Top-up Transactions
        </button>
        <button
          onClick={() => setActiveSubTab("txns")}
          className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
            activeSubTab === "txns"
              ? "bg-[#ffb703] text-[#0d0f14]"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          Transactions Ledger
        </button>
      </div>

      {/* Sub-tab Content */}
      {activeSubTab === "home" && (
        <div className="space-y-6">
          {/* Balance Card (Matching Image 3 Dark Box) */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#161922] shadow-xl">
            <div className="bg-[#0d0f14] p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#ffb703]">BALANCE</p>
                <p className="mt-1 text-3xl font-black text-white">{formatBdt(balance)}</p>
              </div>
              <button
                onClick={() => setActiveSubTab("topup")}
                className="rounded-xl bg-[#ffb703] px-5 py-2.5 text-xs font-bold text-[#0d0f14] shadow-md shadow-[#ffb703]/20 hover:bg-[#e0a100]"
              >
                + Top Up Wallet
              </button>
            </div>

            <div className="p-6">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Recent Transactions</h3>
              {transactions.length === 0 ? (
                <p className="text-center py-6 text-xs text-white/50">No Transaction Found.</p>
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3 text-xs">
                      <div>
                        <p className="font-bold text-white capitalize">{t.type.replace("_", " ")}</p>
                        <p className="text-[11px] text-white/50">{formatDhakaDate(t.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${t.type === "topup" || t.type === "refund" ? "text-green-400" : "text-white"}`}>
                          {t.type === "topup" || t.type === "refund" ? "+" : "-"}{formatBdt(t.amount_bdt)}
                        </p>
                        <p className="text-[10px] text-white/40">Bal: {formatBdt(t.balance_after)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "topup" && (
        <div className="rounded-2xl border border-white/10 bg-[#161922] p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-black text-white">Add Funds to Wallet (BDT)</h2>

          {errorMsg && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-xs font-semibold text-red-400">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-4 text-xs font-semibold text-green-400">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleTopupSubmit} className="space-y-5">
            {/* Amount Selection */}
            <div>
              <label className="block text-xs font-bold text-white/80 mb-2">Top-up Amount (BDT) *</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[100, 500, 1000, 2000].map((amt) => (
                  <button
                    type="button"
                    key={amt}
                    onClick={() => setAmountBdt(String(amt))}
                    className={`rounded-xl py-2 text-xs font-bold transition ${
                      amountBdt === String(amt)
                        ? "bg-[#ffb703] text-[#0d0f14]"
                        : "bg-white/[0.05] text-white/70 hover:bg-white/10"
                    }`}
                  >
                    BDT {amt}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="50"
                max="50000"
                value={amountBdt}
                onChange={(e) => setAmountBdt(e.target.value)}
                placeholder="Enter custom amount in BDT"
                className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-4 py-3 text-xs text-white placeholder-white/30 focus:border-[#ffb703] focus:outline-none"
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-white/80 mb-2">Payment Method *</label>
              <div className="grid grid-cols-2 gap-2">
                {(["bkash", "nagad"] as const).map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`rounded-xl py-2.5 text-xs font-bold capitalize transition ${
                      method === m
                        ? "bg-[#ffb703] text-[#0d0f14]"
                        : "bg-white/[0.05] text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Instruction Card */}
            <div className="rounded-xl border border-[#ffb703]/30 bg-[#ffb703]/10 p-4 text-xs space-y-1">
              <p className="font-bold text-[#ffb703]">{topupPaymentDetails[method].type}: {topupPaymentDetails[method].number}</p>
              <p className="text-white/80">{topupPaymentDetails[method].instruction}</p>
            </div>

            {/* Sender Number & TrxID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Sender Mobile Number *</label>
                <input
                  type="text"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="e.g. 01712345678"
                  className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-4 py-3 text-xs text-white placeholder-white/30 focus:border-[#ffb703] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Transaction ID (TrxID) *</label>
                <input
                  type="text"
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  placeholder="e.g. 9B7X2K4M10"
                  className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-4 py-3 text-xs text-white placeholder-white/30 focus:border-[#ffb703] focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#ffb703] py-3 text-xs font-bold text-[#0d0f14] shadow-md shadow-[#ffb703]/20 hover:bg-[#e0a100] disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Top-Up Request →"}
            </button>
          </form>
        </div>
      )}

      {(activeSubTab === "topup_txns" || activeSubTab === "txns") && (
        <div className="rounded-2xl border border-white/10 bg-[#161922] p-6 space-y-4">
          <h2 className="text-lg font-black text-white">
            {activeSubTab === "topup_txns" ? "Top-up Requests History" : "Wallet Transactions Ledger"}
          </h2>

          {transactions.length === 0 ? (
            <p className="text-center py-6 text-xs text-white/50">No transaction records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white">
                <thead className="bg-[#0d0f14] text-white/50 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Type / Method</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">TrxID / Ref</th>
                    <th className="p-3">Balance After</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(activeSubTab === "topup_txns" ? topupTxns : transactions).map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 text-white/70">{formatDhakaDate(t.created_at)}</td>
                      <td className="p-3 capitalize font-bold">{t.type.replace("_", " ")} ({t.method})</td>
                      <td className="p-3 font-bold">{formatBdt(t.amount_bdt)}</td>
                      <td className="p-3 font-mono text-white/60">{t.txn_ref || "-"}</td>
                      <td className="p-3">{formatBdt(t.balance_after)}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            t.status === "approved"
                              ? "bg-green-500/20 text-green-400"
                              : t.status === "rejected"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
