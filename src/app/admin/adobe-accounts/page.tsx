"use client";

import React, { useState, useEffect } from "react";
function Card({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-xl border border-white/10 bg-[#0f141f] ${className}`} {...props}>
      {children}
    </div>
  );
}

function Button({ className = "", children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${className}`} {...props}>
      {children}
    </button>
  );
}

interface AdobeAccount {
  id: string;
  email: string;
  password: string;
  is_used: boolean;
  last_otp: string | null;
  last_otp_time: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdobeAccountsPage() {
  const [accounts, setAccounts] = useState<AdobeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/admin/adobe-accounts");
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts);
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateAccount = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/adobe-accounts", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        await fetchAccounts();
      }
    } catch (err) {
      console.error("Failed to generate account:", err);
    } finally {
      setGenerating(false);
    }
  };

  const generateBulkAccounts = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/adobe-accounts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: bulkCount }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAccounts();
      }
    } catch (err) {
      console.error("Failed to generate bulk accounts:", err);
    } finally {
      setGenerating(false);
    }
  };

  const toggleUsedStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/adobe-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_used: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAccounts();
      }
    } catch (err) {
      console.error("Failed to update account:", err);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;
    
    try {
      const res = await fetch(`/api/admin/adobe-accounts?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchAccounts();
      }
    } catch (err) {
      console.error("Failed to delete account:", err);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const availableCount = accounts.filter((a) => !a.is_used).length;
  const usedCount = accounts.filter((a) => a.is_used).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Adobe Account Stock</p>
        <h1 className="mt-2 text-3xl font-black">Adobe Permanent Accounts</h1>
        <p className="muted mt-2 max-w-2xl">
          Manage permanent Adobe account credentials. OTP codes received via Cloudflare Email Worker will be automatically linked to accounts.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-semibold text-[#aab0bd]">Total Accounts</p>
          <p className="mt-2 text-3xl font-black">{accounts.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-[#aab0bd]">Available</p>
          <p className="mt-2 text-3xl font-black text-green-500">{availableCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-[#aab0bd]">Used</p>
          <p className="mt-2 text-3xl font-black text-red-500">{usedCount}</p>
        </Card>
      </div>

      {/* Generate Accounts */}
      <Card className="p-5">
        <h2 className="text-lg font-bold">Generate New Accounts</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            onClick={generateAccount}
            disabled={generating}
            className="bg-[#e5243b] hover:bg-[#c41e3a]"
          >
            {generating ? "Generating..." : "Generate 1 Account"}
          </Button>
          
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="50"
              value={bulkCount}
              onChange={(e) => setBulkCount(Number(e.target.value))}
              className="w-20 rounded border border-[#2a2f3e] bg-[#1a1f2e] px-3 py-2 text-sm"
            />
            <Button
              onClick={generateBulkAccounts}
              disabled={generating}
              className="bg-[#2a2f3e] hover:bg-[#3a3f4e]"
            >
              {generating ? "Generating..." : `Generate ${bulkCount} Accounts`}
            </Button>
          </div>
        </div>
      </Card>

      {/* Accounts Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1a1f2e]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Password</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Last OTP</th>
                <th className="px-4 py-3 text-left font-semibold">Created</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#aab0bd]">
                    Loading accounts...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#aab0bd]">
                    No accounts found. Generate your first account above.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id} className="border-t border-[#2a2f3e]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs">{account.email}</code>
                        <button
                          onClick={() => copyToClipboard(account.email)}
                          className="text-[#aab0bd] hover:text-white"
                          title="Copy email"
                        >
                          📋
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs">
                          {showPasswords[account.id] ? account.password : "••••••••••••"}
                        </code>
                        <button
                          onClick={() => togglePasswordVisibility(account.id)}
                          className="text-[#aab0bd] hover:text-white"
                          title={showPasswords[account.id] ? "Hide password" : "Show password"}
                        >
                          {showPasswords[account.id] ? "🙈" : "👁️"}
                        </button>
                        <button
                          onClick={() => copyToClipboard(account.password)}
                          className="text-[#aab0bd] hover:text-white"
                          title="Copy password"
                        >
                          📋
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          account.is_used
                            ? "bg-red-500/20 text-red-400"
                            : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {account.is_used ? "Used" : "Available"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {account.last_otp ? (
                        <div>
                          <code className="text-xs font-bold text-green-400">
                            {account.last_otp}
                          </code>
                          {account.last_otp_time && (
                            <p className="mt-1 text-xs text-[#aab0bd]">
                              {new Date(account.last_otp_time).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#aab0bd]">No OTP yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#aab0bd]">
                      {new Date(account.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleUsedStatus(account.id, account.is_used)}
                          className="rounded px-2 py-1 text-xs font-semibold bg-[#2a2f3e] hover:bg-[#3a3f4e]"
                          title={account.is_used ? "Mark as available" : "Mark as used"}
                        >
                          {account.is_used ? "Make Available" : "Mark Used"}
                        </button>
                        <button
                          onClick={() => deleteAccount(account.id)}
                          className="rounded px-2 py-1 text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          title="Delete account"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
