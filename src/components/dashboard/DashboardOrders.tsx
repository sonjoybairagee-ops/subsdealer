"use client";

import { useState } from "react";
import Link from "next/link";
import { formatBdt, formatDhakaDate, orderStatusMeta, paymentMethodLabel, SubOrderStatus } from "@/lib/subscriptions";

interface OrderItem {
  id: string;
  status: string;
  amount_bdt: number;
  method: string;
  txn_ref?: string | null;
  created_at: string;
  reject_reason?: string | null;
  hold_reason?: string | null;
  sub_products?: { name: string; slug: string } | null;
  sub_plans?: { name: string } | null;
}

interface DashboardOrdersProps {
  orders: OrderItem[];
}

export function DashboardOrders({ orders }: DashboardOrdersProps) {
  const [filter, setFilter] = useState<string>("all");

  const filteredOrders = orders.filter((o) => {
    if (filter === "all") return true;
    return o.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#ffb703] to-[#fb8500] p-6 text-[#0d0f14] shadow-xl">
        <p className="text-xs font-black uppercase tracking-wider opacity-80">YOUR SUBSDEALER ACCOUNT</p>
        <h1 className="mt-1 text-2xl font-black">Order Details</h1>
        <p className="mt-1 text-xs font-semibold opacity-90">
          Review your subscription order history and current verification status.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {["all", "pending", "approved", "rejected"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-xl px-4 py-2 text-xs font-bold capitalize transition ${
              filter === tab
                ? "bg-[#ffb703] text-[#0d0f14]"
                : "bg-white/[0.05] text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#161922] p-8 text-center">
          <p className="text-sm font-bold text-white">No orders found</p>
          <p className="mt-1 text-xs text-white/60">
            {filter === "all"
              ? "You haven't placed any orders yet."
              : `No orders with status "${filter}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((o) => {
            const meta = orderStatusMeta(o.status as SubOrderStatus);
            return (
              <div
                key={o.id}
                className="rounded-2xl border border-white/10 bg-[#161922] p-5 flex flex-wrap items-center justify-between gap-4 transition hover:border-white/20"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-white">{o.sub_products?.name || "Subscription"}</p>
                    <span className={`badge badge-${meta.tone === "green" ? "green" : meta.tone}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs text-white/70">
                    {o.sub_plans?.name || "Plan"} · {formatBdt(o.amount_bdt)} · {paymentMethodLabel(o.method)}
                    {o.txn_ref ? ` · TrxID: ${o.txn_ref}` : ""}
                  </p>
                  <p className="text-[11px] text-white/40">
                    Order ID: <span className="font-mono">{o.id.slice(0, 8)}</span> · Submitted {formatDhakaDate(o.created_at)}
                  </p>
                  {o.status === "rejected" && o.reject_reason && (
                    <p className="mt-1 text-xs font-semibold text-red-400">
                      Reason: {o.reject_reason}
                    </p>
                  )}
                </div>

                {o.status === "rejected" && o.sub_products?.slug && (
                  <Link
                    href={`/subscriptions/${o.sub_products.slug}`}
                    className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20"
                  >
                    Reorder →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
