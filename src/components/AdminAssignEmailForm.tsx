"use client";

import { useState, useEffect } from "react";

interface UserOption {
  id: string;
  email: string;
  full_name: string | null;
}

interface AssignedEmailItem {
  id: string;
  user_id: string;
  email_address: string;
  password?: string;
  service_name: string;
  status: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

export function AdminAssignEmailForm() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [assignedList, setAssignedList] = useState<AssignedEmailItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("012345678a@");
  const [serviceName, setServiceName] = useState("Adobe Creative Cloud");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch("/api/admin/assign-email");
      const json = await res.json();
      if (json.success) {
        setUsers(json.users || []);
        setAssignedList(json.assigned_emails || []);
        if (json.users?.length > 0 && !selectedUserId) {
          setSelectedUserId(json.users[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load admin assign email data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateRandomEmail = () => {
    const names = ["sarahanderson", "alexsmith", "michaelwilliams", "emilybrown", "davidjones"];
    const num = Math.floor(10000 + Math.random() * 90000);
    const randName = names[Math.floor(Math.random() * names.length)];
    setEmailAddress(`${randName}${num}@portal.subsdealer.com`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !emailAddress || !password) {
      setMessage({ type: "error", text: "Please select a user, enter email, and enter password." });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);
      const res = await fetch("/api/admin/assign-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUserId,
          email_address: emailAddress,
          password: password,
          service_name: serviceName,
          status: "NEW",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Subscription email & password assigned successfully!" });
        setEmailAddress("");
        await loadData();
      } else {
        setMessage({ type: "error", text: json.error || "Failed to assign email" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Submission failed" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assigned account?")) return;
    try {
      const res = await fetch(`/api/admin/assign-email?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        await loadData();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="space-y-8 text-white">
      {/* Assign Account Form Card */}
      <div className="card p-6 border border-white/10 space-y-5 bg-neutral-900/90">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>👤</span> Assign Shared Subscription Account
            </h3>
            <p className="text-xs text-neutral-400">
              Assign catch-all email, login password, and service to a customer.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateRandomEmail}
            className="btn-secondary text-xs"
          >
            🎲 Auto Generate Email
          </button>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold ${
              message.type === "success"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {/* User Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase mb-1">
              Select Customer
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-xl bg-black/60 border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                </option>
              ))}
            </select>
          </div>

          {/* Service Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase mb-1">
              Service / Product Name
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g. Adobe Creative Cloud"
              className="w-full rounded-xl bg-black/60 border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase mb-1">
              Assigned Email Address
            </label>
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="e.g. sarahanderson40027@portal.subsdealer.com"
              className="w-full rounded-xl bg-black/60 border border-white/10 px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase mb-1">
              Account Password
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="e.g. 012345678a@"
              className="w-full rounded-xl bg-black/60 border border-white/10 px-3 py-2.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="sm:col-span-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs w-full py-3 font-bold"
            >
              {submitting ? "Assigning Account..." : "✓ Assign Account to Customer"}
            </button>
          </div>
        </form>
      </div>

      {/* Currently Assigned Accounts Table */}
      <div className="card p-6 border border-white/10 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>📋</span> Assigned Subscription Accounts ({assignedList.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-neutral-400 uppercase text-[11px]">
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Service</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Password</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {assignedList.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-3">
                    <p className="font-semibold text-white">{item.profiles?.full_name || "Customer"}</p>
                    <p className="text-[10px] text-neutral-400">{item.profiles?.email}</p>
                  </td>
                  <td className="py-3 px-3 text-neutral-300 font-medium">
                    {item.service_name}
                  </td>
                  <td className="py-3 px-3 font-mono text-red-400">
                    {item.email_address}
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-400">
                    {item.password || "012345678a@"}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-400 hover:text-red-300 text-xs font-semibold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {assignedList.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-neutral-500">
                    No assigned accounts yet. Use the form above to assign one.
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
