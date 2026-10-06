"use client";

import React, { useState, useEffect } from "react";
import { UserPlus, Mail, Key, Trash2, RefreshCw, CheckCircle, AlertCircle, Shield, KeyRound, Clock, PlusCircle, Ban } from "lucide-react";

interface UserOption {
  id: string;
  email: string;
  full_name: string | null;
}

interface AssignedAccount {
  id: string;
  user_id: string;
  target_customer_email?: string;
  email_address: string;
  password?: string;
  access_key?: string;
  service_name: string;
  status: string;
  expires_at?: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

export function AdminAccountAssigner() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [assignedAccounts, setAssignedAccounts] = useState<AssignedAccount[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [serviceName, setServiceName] = useState("Adobe Creative Cloud");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("012345678a@");
  const [durationDays, setDurationDays] = useState(30);
  const [lastAccessKey, setLastAccessKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/assign-account");
      const json = await res.json();
      if (json.success) {
        setAssignedAccounts(json.accounts || []);
        setUsers(json.users || []);
        if (json.users?.length > 0 && !userEmail) {
          setUserEmail(json.users[0].email);
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Step 3: Random Email & Password Generator Helper
  const handleGenerateRandomEmail = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const generatedEmail = `user${randomNum}@portal.subsdealer.com`;

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$";
    let generatedPass = "";
    for (let i = 0; i < 10; i++) {
      generatedPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    generatedPass += "@1";

    setEmailAddress(generatedEmail);
    setPassword(generatedPass);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !emailAddress || !password) {
      setMessage({ type: "error", text: "Target Customer Email, Subscription Email, and Password are required." });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);
      setLastAccessKey(null);

      const res = await fetch("/api/admin/assign-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_customer_email: userEmail,
          user_email: userEmail,
          email_address: emailAddress,
          password: password,
          service_name: serviceName,
          status: "active",
          duration_days: durationDays,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setLastAccessKey(json.access_key || null);

        // Automatically Dispatch Email & WhatsApp Notification
        let notifyMessage = "";
        try {
          const notifyRes = await fetch("/api/admin/send-credential", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              target_customer_email: userEmail,
              service_name: serviceName,
              email_address: emailAddress,
              password: password,
              access_key: json.access_key,
            }),
          });
          const notifyJson = await notifyRes.json();
          if (notifyJson.success) {
            notifyMessage = " Email & WhatsApp notification dispatched to customer!";
          }
        } catch (notifyErr) {
          console.warn("Credential notification dispatch error:", notifyErr);
        }

        setMessage({
          type: "success",
          text: `Account successfully assigned! Access Key: ${json.access_key}.${notifyMessage}`,
        });
        setEmailAddress("");
        await fetchAccounts();
      } else {
        setMessage({ type: "error", text: json.error || "Failed to assign account." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An unexpected error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccountAction = async (id: string, email: string, action: "extend" | "expire") => {
    try {
      const res = await fetch("/api/admin/assign-account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, email_address: email, action, extend_days: 30 }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchAccounts();
      } else {
        alert(json.error || "Failed to update account status.");
      }
    } catch (err: any) {
      console.error("Account action error:", err);
    }
  };

  const handleDeleteAccount = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to remove access for ${email}?`)) return;
    try {
      const res = await fetch(`/api/admin/assign-account?id=${id}&email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        await fetchAccounts();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Helper to calculate days remaining
  const getExpiryStatus = (acc: AssignedAccount) => {
    const now = new Date();
    const expiryDate = acc.expires_at
      ? new Date(acc.expires_at)
      : new Date(new Date(acc.created_at || now).getTime() + 30 * 24 * 60 * 60 * 1000);

    const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    const isExpired = diffDays <= 0 || (acc.status || "").toLowerCase() === "expired";

    return {
      expiryDate,
      diffDays,
      isExpired,
    };
  };

  return (
    <div className="space-y-8 text-white font-sans">
      {/* 1. Assignment Form Panel */}
      <div className="rounded-2xl border border-white/10 bg-[#161922] p-6 shadow-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-green flex items-center gap-1">
                <Shield className="w-3 h-3" /> Admin Controls
              </span>
              <span className="text-xs text-neutral-400">Subsdealer Portal Management</span>
            </div>
            <h2 className="text-xl font-bold mt-1 text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-red-500" /> Assign Shared Account to Customer
            </h2>
            <p className="text-xs text-neutral-400">
              Select target customer email, click Generate Random Email & Password, and set plan validity.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateRandomEmail}
            className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-red-600/20 cursor-pointer"
          >
            🎲 Generate Random Email & Pass
          </button>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/10 text-red-400 border border-red-500/30"
            }`}
          >
            {message.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <div>
              <p>{message.text}</p>
              {lastAccessKey && (
                <p className="font-mono text-emerald-300 font-bold mt-1">
                  Access Key: <span className="bg-black/40 px-2 py-0.5 rounded border border-emerald-500/30">{lastAccessKey}</span>
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleAssignSubmit} className="grid gap-4 sm:grid-cols-3">
          {/* Target Customer Email */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1">
              Target Customer Email
            </label>
            <div className="relative">
              <input
                type="text"
                list="user-emails"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="customer@gmail.com"
                className="w-full rounded-xl bg-black/60 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              />
              <datalist id="user-emails">
                {users.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          {/* Service Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1">
              Service / Product Name
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g. Adobe Creative Cloud, Canva Pro"
              className="w-full rounded-xl bg-black/60 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Validity Duration */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1">
              Plan Validity (Days)
            </label>
            <select
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full rounded-xl bg-black/60 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
            >
              <option value={30}>30 Days (Standard Monthly)</option>
              <option value={60}>60 Days (2 Months)</option>
              <option value={90}>90 Days (3 Months)</option>
              <option value={365}>365 Days (1 Year)</option>
            </select>
          </div>

          {/* Subscription Email Address */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1">
              Subscription Email Address
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 absolute left-3 top-3.5 text-neutral-500" />
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="user59832@portal.subsdealer.com"
                className="w-full rounded-xl bg-black/60 border border-white/10 pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              />
            </div>
          </div>

          {/* Subscription Password */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1">
              Subscription Password
            </label>
            <div className="relative">
              <Key className="w-3.5 h-3.5 absolute left-3 top-3.5 text-amber-500" />
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl bg-black/60 border border-white/10 pl-9 pr-3.5 py-2.5 text-xs text-amber-400 focus:outline-none focus:border-red-500 font-mono"
              />
            </div>
          </div>

          <div className="sm:col-span-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3 text-xs font-bold flex items-center justify-center gap-2"
            >
              {submitting ? "Assigning Account..." : "✓ Assign Account to Customer"}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Currently Assigned Accounts Table */}
      <div className="rounded-2xl border border-white/10 bg-[#161922] p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>📋</span> Active Assigned Accounts ({assignedAccounts.length})
          </h3>

          <button
            onClick={fetchAccounts}
            disabled={loading}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Table
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-neutral-400 uppercase text-[11px]">
                <th className="py-3 px-3">Target Customer</th>
                <th className="py-3 px-3">Access Key</th>
                <th className="py-3 px-3">Service</th>
                <th className="py-3 px-3">Subscription Email</th>
                <th className="py-3 px-3">Validity / Expiry</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {assignedAccounts.map((item) => {
                const { diffDays, isExpired, expiryDate } = getExpiryStatus(item);
                return (
                  <tr key={item.id || item.email_address} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-3">
                      <p className="font-semibold text-white">
                        {item.profiles?.full_name || item.target_customer_email || "Customer"}
                      </p>
                      <p className="text-[10px] text-neutral-400">{item.profiles?.email || item.target_customer_email || "No email"}</p>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-emerald-400 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{item.access_key || "SUBS-KEY"}</span>
                    </td>
                    <td className="py-3.5 px-3 text-neutral-300 font-medium">
                      {item.service_name}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-red-400">
                      {item.email_address}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-3.5 h-3.5 ${isExpired ? "text-red-400" : "text-amber-400"}`} />
                        <span className={`font-mono text-[11px] ${isExpired ? "text-red-400 font-bold" : "text-neutral-300"}`}>
                          {isExpired ? "Expired" : `${diffDays} days left`}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-0.5">{expiryDate.toLocaleDateString()}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          isExpired
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {isExpired ? "EXPIRED" : item.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleAccountAction(item.id, item.email_address, "extend")}
                          className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded hover:bg-emerald-500/10 transition inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                          title="Extend Validity +30 Days"
                        >
                          <PlusCircle className="w-3.5 h-3.5" /> +30d
                        </button>
                        <button
                          onClick={() => handleAccountAction(item.id, item.email_address, "expire")}
                          className="text-amber-400 hover:text-amber-300 p-1.5 rounded hover:bg-amber-500/10 transition inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                          title="Mark Expired / Block Access"
                        >
                          <Ban className="w-3.5 h-3.5" /> Expire
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(item.id, item.email_address)}
                          className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 transition inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                          title="Delete Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {assignedAccounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-500">
                    No assigned accounts recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminAccountAssigner;
