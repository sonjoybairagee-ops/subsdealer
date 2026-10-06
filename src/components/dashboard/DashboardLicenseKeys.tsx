"use client";

import { useState } from "react";
import { formatDhakaDate } from "@/lib/subscriptions";

export interface LicenseKeyItem {
  id: string;
  order_id?: string | null;
  product_name: string;
  assigned_at?: string | null;
}

interface DashboardLicenseKeysProps {
  keys: LicenseKeyItem[];
}

export function DashboardLicenseKeys({ keys }: DashboardLicenseKeysProps) {
  const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleRevealKey = async (id: string) => {
    if (revealedKeys[id]) return;

    setLoadingId(id);
    setErrorId((prev) => ({ ...prev, [id]: "" }));

    try {
      const res = await fetch("/api/subscriptions/license-keys/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKeyId: id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reveal license key");

      setRevealedKeys((prev) => ({ ...prev, [id]: data.serialKey }));
    } catch (err: any) {
      setErrorId((prev) => ({ ...prev, [id]: err.message || "Error revealing key" }));
    } finally {
      setLoadingId(null);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Yellow Banner (Matching Image 5) */}
      <div className="rounded-2xl bg-gradient-to-r from-[#ffb703] to-[#fb8500] p-6 sm:p-8 text-[#0d0f14] shadow-xl">
        <p className="text-xs font-black uppercase tracking-wider opacity-80">YOUR SUBSDEALER ACCOUNT</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">License Keys</h1>
        <p className="mt-2 text-xs font-semibold opacity-90 sm:text-sm">
          Manage your orders, wallet, and license keys in one place.
        </p>
      </div>

      {/* Main License Keys Card (Matching Image 5) */}
      <div className="rounded-2xl border border-white/10 bg-[#161922] p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Your license keys</h2>
          <p className="mt-1 text-xs text-white/60">Choose View to securely reveal the key for an order.</p>
        </div>

        {keys.length === 0 ? (
          <div className="rounded-xl bg-[#0d0f14] p-8 text-center border border-white/5">
            <p className="text-sm font-bold text-white">No license keys found</p>
            <p className="mt-1 text-xs text-white/50">
              When you purchase a key-based product, your serial key assigned by Admin will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#0d0f14] text-white/50 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">ORDER ID</th>
                  <th className="p-4">PRODUCT</th>
                  <th className="p-4">SERIAL KEY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-mono font-bold text-white/80">
                      {k.order_id ? k.order_id.slice(0, 8) : "N/A"}
                    </td>
                    <td className="p-4 font-bold text-white">{k.product_name}</td>
                    <td className="p-4">
                      {revealedKeys[k.id] ? (
                        <div className="flex items-center gap-2">
                          <code className="rounded-lg bg-[#0d0f14] px-3 py-1.5 font-mono text-xs font-bold text-[#ffb703] border border-[#ffb703]/30">
                            {revealedKeys[k.id]}
                          </code>
                          <button
                            onClick={() => handleCopy(k.id, revealedKeys[k.id])}
                            className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-white/20"
                          >
                            {copiedId === k.id ? "Copied! ✓" : "Copy"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRevealKey(k.id)}
                          disabled={loadingId === k.id}
                          className="rounded-xl bg-[#ffb703] px-4 py-2 text-xs font-bold text-[#0d0f14] shadow-md shadow-[#ffb703]/20 hover:bg-[#e0a100] disabled:opacity-50"
                        >
                          {loadingId === k.id ? "Decrypting..." : "View Serial Key"}
                        </button>
                      )}
                      {errorId[k.id] && (
                        <p className="mt-1 text-[11px] font-semibold text-red-400">{errorId[k.id]}</p>
                      )}
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
