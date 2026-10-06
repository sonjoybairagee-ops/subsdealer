"use client";

import React, { useState, useEffect } from "react";
import { Shield, RefreshCw, Mail, Clock, Search, Key } from "lucide-react";

interface OTPLog {
  id: string;
  email_address: string;
  service_name?: string;
  subject?: string;
  otp_code: string;
  received_at: string;
}

export default function AdminOTPLogsPage() {
  const [logs, setLogs] = useState<OTPLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchOTPLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/otp-logs");
      const data = await res.json();
      if (res.ok && data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to fetch OTP logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOTPLogs();
    const interval = setInterval(fetchOTPLogs, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(
    (log) =>
      log.email_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.otp_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto text-white space-y-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#27272a] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/10 text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-md border border-amber-500/20 uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Admin Control
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-1 text-zinc-100">Live OTP History & Logs</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Track all incoming verification codes and customer email activities in real-time.
          </p>
        </div>
        <button
          onClick={fetchOTPLogs}
          className="bg-[#27272a] hover:bg-[#3f3f46] text-zinc-300 text-xs font-medium px-4 py-2.5 rounded-lg transition border border-[#3f3f46] flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Logs
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by email address or OTP code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-10 pr-4 py-3 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition font-mono"
        />
      </div>

      {/* Logs Table */}
      <div className="bg-[#141416] border border-[#27272a] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#18181b] border-b border-[#27272a] text-zinc-400 uppercase font-mono text-[10px]">
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Subject / Service</th>
                <th className="py-3 px-4">Verification Code / OTP</th>
                <th className="py-3 px-4">Received Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]/60">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#18181b]/50 transition">
                    <td className="py-3.5 px-4 font-mono text-zinc-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      {log.email_address}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 truncate max-w-xs">
                      {log.subject || log.service_name || "Adobe Verification"}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-sm tracking-wider">
                      <span className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                        <Key className="w-3 h-3 text-emerald-400" />
                        {log.otp_code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.received_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-zinc-500 italic">
                    {loading ? "Loading OTP history..." : "No OTP logs found yet."}
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
