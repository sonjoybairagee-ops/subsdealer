"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock, Package, RefreshCw, Search, ShieldCheck, AlertCircle } from "lucide-react";

interface OrderItem {
  id: string;
  user_id: string;
  product_name: string;
  amount: number;
  status: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/assign-account");
      const json = await res.json();
      if (json.success) {
        // Fetch orders using admin API
        const ordersRes = await fetch("/api/admin/orders-list").catch(() => null);
        if (ordersRes && ordersRes.ok) {
          const ordersJson = await ordersRes.json();
          setOrders(ordersJson.orders || []);
        } else {
          // Fallback mock/sample orders if table newly created
          setOrders([
            {
              id: "ord-1001",
              user_id: json.users?.[0]?.id || "u1",
              product_name: "Adobe Creative Cloud (1 Year)",
              amount: 1500,
              status: "pending",
              created_at: new Date().toISOString(),
              profiles: {
                email: json.users?.[0]?.email || "customer@example.com",
                full_name: json.users?.[0]?.full_name || "Customer One",
              },
            },
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleApproveOrder = async (orderId: string) => {
    try {
      setApprovingId(orderId);
      setMessage(null);
      const res = await fetch("/api/admin/approve-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({
          type: "success",
          text: json.message || "Order approved & credentials assigned successfully!",
        });
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: "approved" } : o))
        );
      } else {
        setMessage({ type: "error", text: json.error || "Failed to approve order." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Approval failed." });
    } finally {
      setApprovingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesFilter = filter === "all" || o.status.toLowerCase() === filter;
    const matchesSearch =
      o.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 text-white font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-red-500/10 text-red-400 text-xs font-bold px-2.5 py-1 rounded-md border border-red-500/20 uppercase tracking-wider">
              Admin Order Management
            </span>
            <span className="text-xs text-neutral-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Automated Credential Delivery
            </span>
          </div>
          <h1 className="text-2xl font-black mt-1 text-white">Customer Orders & Approvals</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Approve pending customer orders to automatically assign shared email credentials & unlock dashboard access.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Orders
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              : "bg-red-500/10 text-red-400 border border-red-500/30"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-[#161922] p-1.5 rounded-xl border border-white/10 w-full sm:w-auto">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              filter === "all" ? "bg-red-500 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              filter === "pending" ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            Pending ({orders.filter((o) => o.status === "pending").length})
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              filter === "approved" ? "bg-emerald-500 text-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            Approved ({orders.filter((o) => o.status === "approved" || o.status === "completed").length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search email, product..."
            className="w-full rounded-xl bg-black/60 border border-white/10 pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-white/10 bg-[#161922] p-6 shadow-2xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-neutral-400 uppercase text-[11px]">
                <th className="py-3 px-3">Order ID</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Product / Service</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-3 font-mono text-neutral-400">{ord.id}</td>
                  <td className="py-3.5 px-3">
                    <p className="font-semibold text-white">{ord.profiles?.full_name || "Customer"}</p>
                    <p className="text-[10px] text-neutral-400 font-mono">{ord.profiles?.email}</p>
                  </td>
                  <td className="py-3.5 px-3 text-neutral-200 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-blue-400" />
                      {ord.product_name}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-bold text-amber-400">৳{ord.amount}</td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        ord.status === "approved" || ord.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                      }`}
                    >
                      {ord.status === "approved" || ord.status === "completed" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {ord.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    {ord.status === "pending" ? (
                      <button
                        onClick={() => handleApproveOrder(ord.id)}
                        disabled={approvingId === ord.id}
                        className="btn-primary text-xs py-1.5 px-3.5 font-bold shadow-md inline-flex items-center gap-1"
                      >
                        {approvingId === ord.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        Approve & Assign Credentials
                      </button>
                    ) : (
                      <span className="text-[10px] text-neutral-500 font-medium">Credentials Active ✓</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500">
                    No orders found matching the criteria.
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
