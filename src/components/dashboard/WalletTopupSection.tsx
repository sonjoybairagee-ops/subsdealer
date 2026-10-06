"use client";

import React, { useState } from "react";
import { Wallet, CreditCard, Send, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";
import { formatBdt } from "@/lib/subscriptions";

interface WalletTopupProps {
  currentBalance: number;
}

export function WalletTopupSection({ currentBalance }: WalletTopupProps) {
  const [amount, setAmount] = useState("500");
  const [paymentMethod, setPaymentMethod] = useState("bKash");
  const [trxId, setTrxId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const bkashNumber = "01812345678";
  const nagadNumber = "01712345678";

  const copyToClipboard = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !trxId) {
      setMessage({ type: "error", text: "Please enter a valid amount and Transaction ID (TrxID)." });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);
      const res = await fetch("/api/wallet/add-funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          payment_method: paymentMethod,
          trx_id: trxId,
          phone_number: phoneNumber,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({
          type: "success",
          text: json.message || "Deposit request submitted! Admin will add funds shortly.",
        });
        setTrxId("");
        setPhoneNumber("");
      } else {
        setMessage({ type: "error", text: json.error || "Failed to submit deposit request." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Deposit request failed." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-white font-sans">
      {/* Balance Card */}
      <div className="rounded-2xl border border-white/10 bg-[#161922] p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Wallet className="w-4 h-4" /> Account Wallet Balance
          </div>
          <h2 className="text-3xl font-extrabold text-white mt-1">
            {formatBdt(currentBalance)}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Use your wallet balance for 1-click instant subscription purchases & renewals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge badge-green flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Auto-Verification Active
          </span>
        </div>
      </div>

      {/* Manual Deposit Form */}
      <div className="rounded-2xl border border-white/10 bg-[#161922] p-6 shadow-2xl space-y-5">
        <div className="border-b border-white/10 pb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-red-500" /> Add Funds via bKash / Nagad / Rocket
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Send Money / Cash In to our merchant number and submit your TrxID below to credit your wallet.
          </p>
        </div>

        {/* Payment Numbers Instructions */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-pink-500/20 bg-pink-950/20 p-4 space-y-1">
            <p className="text-[11px] font-bold text-pink-400 uppercase">bKash Personal / Send Money</p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-black text-white">{bkashNumber}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(bkashNumber)}
                className="text-xs text-pink-300 hover:text-white flex items-center gap-1"
              >
                {copiedNumber === bkashNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-orange-500/20 bg-orange-950/20 p-4 space-y-1">
            <p className="text-[11px] font-bold text-orange-400 uppercase">Nagad Personal / Send Money</p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-black text-white">{nagadNumber}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(nagadNumber)}
                className="text-xs text-orange-300 hover:text-white flex items-center gap-1"
              >
                {copiedNumber === nagadNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/10 text-red-400 border border-red-500/30"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* Deposit Request Form */}
        <form onSubmit={handleSubmitDeposit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-300 mb-1">
              Select Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-xl bg-black/60 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
            >
              <option value="bKash">bKash</option>
              <option value="Nagad">Nagad</option>
              <option value="Rocket">Rocket</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-300 mb-1">
              Amount (BDT ৳)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
              className="w-full rounded-xl bg-black/60 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-300 mb-1">
              Transaction ID (TrxID)
            </label>
            <input
              type="text"
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
              placeholder="e.g. 9J4K2L8M1N"
              className="w-full rounded-xl bg-black/60 border border-white/10 px-3.5 py-2.5 text-xs text-amber-400 font-mono uppercase focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-300 mb-1">
              Sender Phone Number (Optional)
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="01700000000"
              className="w-full rounded-xl bg-black/60 border border-white/10 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="sm:col-span-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3 text-xs font-bold flex items-center justify-center gap-2"
            >
              {submitting ? "Submitting Request..." : <><Send className="w-3.5 h-3.5" /> Submit Top-up Request</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WalletTopupSection;
