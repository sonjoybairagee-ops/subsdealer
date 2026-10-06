"use client";

import React, { useState, useEffect } from "react";
import { Key, ShieldCheck, Lock, Unlock, Copy, Check, RefreshCw } from "lucide-react";

interface SharedAccount {
  id: string;
  service_name: string;
  email_address: string;
  password: string;
  access_key: string;
  status: string;
}

interface VerificationCode {
  id: string;
  email_address: string;
  subject: string;
  code: string;
  received_at: string;
}

export default function UserEmailPortal() {
  const [accessKeyInput, setAccessKeyInput] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [accountData, setAccountData] = useState<SharedAccount | null>(null);
  const [codes, setCodes] = useState<VerificationCode[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Check if session storage already has the unlocked key
  useEffect(() => {
    const savedKey = sessionStorage.getItem("portal_access_key");
    if (savedKey) {
      setAccessKeyInput(savedKey);
      verifyAndUnlock(savedKey, true);
    }
  }, []);

  const verifyAndUnlock = async (keyToVerify: string, skipStorage = false) => {
    if (!keyToVerify.trim()) {
      setErrorMsg("Please enter your unique access key.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/portal/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey: keyToVerify }),
      });

      const data = await res.json();

      if (res.ok && data.account) {
        setAccountData(data.account);
        setCodes(data.codes || []);
        setIsUnlocked(true);
        if (!skipStorage) {
          sessionStorage.setItem("portal_access_key", keyToVerify);
        }
      } else {
        setErrorMsg(data.error || "Invalid Access Key. Please check your WhatsApp/Email.");
      }
    } catch (err) {
      console.error("Error verifying key:", err);
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-sync OTPs if unlocked
  useEffect(() => {
    if (!isUnlocked || !accountData) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/portal/fetch-otps?email=${encodeURIComponent(accountData.email_address)}`);
        const data = await res.json();
        if (res.ok && data.codes) {
          setCodes(data.codes);
        }
      } catch (err) {
        console.error("Failed to sync OTPs:", err);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [isUnlocked, accountData]);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleLogoutPortal = () => {
    sessionStorage.removeItem("portal_access_key");
    setIsUnlocked(false);
    setAccountData(null);
    setAccessKeyInput("");
  };

  // --- UI STATE 1: LOCKED (Ask for Unique Key) ---
  if (!isUnlocked) {
    return (
      <div className="bg-[#141416] border border-[#27272a] rounded-xl p-8 text-white shadow-xl max-w-xl mx-auto space-y-6 text-center">
        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Shared Subscription Portal</h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Enter the unique Access Key sent to your WhatsApp or Email after order approval to access your credentials & live OTPs.
          </p>
        </div>

        <div className="space-y-3 max-w-md mx-auto">
          <div className="relative">
            <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Enter Unique Access Key (e.g. SUBS-9842-ADOBE)"
              value={accessKeyInput}
              onChange={(e) => setAccessKeyInput(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-10 pr-4 py-3 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition font-mono uppercase"
            />
          </div>

          {errorMsg && <p className="text-red-400 text-xs text-left font-medium">{errorMsg}</p>}

          <button
            onClick={() => verifyAndUnlock(accessKeyInput)}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs py-3 rounded-lg transition flex items-center justify-center gap-2 shadow-lg shadow-amber-600/10 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
            Unlock Portal Access
          </button>
        </div>
      </div>
    );
  }

  // --- UI STATE 2: UNLOCKED (Show Email, Password & Live OTP) ---
  const latestCode = codes[0];

  return (
    <div className="bg-[#141416] border border-[#27272a] rounded-xl p-6 text-white shadow-xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#27272a] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-md border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Portal Unlocked
            </span>
            <span className="text-xs text-zinc-400 font-medium">{accountData?.service_name}</span>
          </div>
          <h2 className="text-xl font-bold mt-1 text-zinc-100">Subscription Credentials & Live OTP</h2>
        </div>
        <button
          onClick={handleLogoutPortal}
          className="bg-[#27272a] hover:bg-[#3f3f46] text-zinc-300 text-xs font-medium px-4 py-2 rounded-lg transition border border-[#3f3f46] self-start md:self-auto cursor-pointer"
        >
          Lock / Exit Portal
        </button>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200/90 leading-relaxed">
        ⚠️ <strong className="font-semibold text-amber-400">নির্দেশনা:</strong> পাসওয়ার্ড পরিবর্তন করবেন না। এটি শেয়ার্ড অ্যাকাউন্ট, নিয়ম না মানলে অ্যাকাউন্ট ব্লক হতে পারে।
      </div>

      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Email */}
          <div className="bg-[#111113] border border-[#27272a] rounded-lg p-3 flex items-center justify-between">
            <div className="overflow-hidden mr-2">
              <span className="text-[10px] text-zinc-500 block uppercase font-medium">Email Address</span>
              <span className="text-xs font-mono text-zinc-200 truncate block">{accountData?.email_address}</span>
            </div>
            <button
              onClick={() => copyToClipboard(accountData?.email_address || "", "email")}
              className="bg-[#27272a] hover:bg-[#3f3f46] text-zinc-300 p-2 rounded-md transition flex items-center gap-1 text-xs shrink-0 cursor-pointer"
            >
              {copiedField === "email" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Password */}
          <div className="bg-[#111113] border border-[#27272a] rounded-lg p-3 flex items-center justify-between">
            <div className="overflow-hidden mr-2">
              <span className="text-[10px] text-zinc-500 block uppercase font-medium">Password</span>
              <span className="text-xs font-mono text-amber-400 truncate block">{accountData?.password}</span>
            </div>
            <button
              onClick={() => copyToClipboard(accountData?.password || "", "password")}
              className="bg-[#27272a] hover:bg-[#3f3f46] text-zinc-300 p-2 rounded-md transition flex items-center gap-1 text-xs shrink-0 cursor-pointer"
            >
              {copiedField === "password" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Live OTP Box */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-500" /> Live Verification Code / OTP
            </span>
            <span className="text-[10px] text-emerald-400 animate-pulse">● Auto-syncing</span>
          </div>

          {latestCode ? (
            <div className="bg-black/40 border border-zinc-800 rounded p-2.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-zinc-400 font-mono">Subject: {latestCode.subject || "Verification"}</div>
                <div className="text-lg font-bold text-emerald-400 font-mono tracking-widest mt-0.5">
                  {latestCode.code}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(latestCode.code, "code")}
                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded text-xs font-medium transition flex items-center gap-1 cursor-pointer"
              >
                {copiedField === "code" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copy Code
              </button>
            </div>
          ) : (
            <div className="text-xs text-zinc-500 italic py-3 text-center bg-black/20 rounded border border-zinc-900">
              No OTP received yet. Trigger login on Adobe / service to get code here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
