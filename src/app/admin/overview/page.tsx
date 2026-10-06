import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const svc = createAdminClient();

  const [ordersRes, profilesRes, subsRes, credsRes, teamsRes] = await Promise.all([
    svc
      .from("sub_orders")
      .select("id, status, amount_bdt, payment_method, created_at, metadata, profiles(email, full_name)")
      .order("created_at", { ascending: false })
      .limit(50),
    svc
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    svc
      .from("subscriptions")
      .select("id, status, created_at")
      .order("created_at", { ascending: false }),
    svc.from("sub_credential_usage").select("*"),
    svc.from("sub_team_usage").select("*"),
  ]);

  const orders = ordersRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const subscriptions = subsRes.data ?? [];
  const credentials = credsRes.data ?? [];
  const teams = teamsRes.data ?? [];

  // Metrics Calculations
  const completedOrders = orders.filter((o) => o.status === "completed");
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.amount_bdt) || 0), 0);
  const totalOrdersCount = orders.length;
  const totalUsersCount = profiles.length;
  const activeSubsCount = subscriptions.filter((s) => s.status === "active").length;
  
  // Credentials Stock Calculation
  const totalCredSlots = credentials.reduce((sum, c) => sum + (Number(c.max_users) || 0), 0);
  const usedCredSlots = credentials.reduce((sum, c) => sum + (Number(c.active_users) || 0), 0);
  const freeCredSlots = credentials.reduce((sum, c) => sum + (Number(c.free_slots) || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-neutral-900 to-black p-6 border border-white/10 shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-green">Live Real-time Analytics</span>
            <span className="text-xs text-neutral-400">Subsdealer Executive Dashboard</span>
          </div>
          <h1 className="mt-2 text-3xl font-black text-white">Store Overview & Performance</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Real-time insights on sales revenue, user signups, wallet balances, and digital supply stock.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/subscriptions" className="btn-secondary text-xs">
            Manage Subscriptions →
          </Link>
          <Link href="/admin/subscriptions/payments" className="btn-primary text-xs">
            Payment Queue ({orders.filter(o => o.status === 'pending').length}) →
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5 border-l-4 border-l-emerald-500 bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Sales Revenue</p>
            <span className="text-xl">💰</span>
          </div>
          <p className="mt-2 text-3xl font-black text-white">৳{totalRevenue.toLocaleString("en-BD")}</p>
          <p className="mt-1 text-xs text-neutral-400">
            From {completedOrders.length} completed orders ({totalOrdersCount} total)
          </p>
        </div>

        <div className="card p-5 border-l-4 border-l-blue-500 bg-blue-950/10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Registered Users</p>
            <span className="text-xl">👤</span>
          </div>
          <p className="mt-2 text-3xl font-black text-white">{totalUsersCount}</p>
          <p className="mt-1 text-xs text-neutral-400">
            {profiles.filter(p => p.role === 'admin').length} Admins • {totalUsersCount - profiles.filter(p => p.role === 'admin').length} Customers
          </p>
        </div>

        <div className="card p-5 border-l-4 border-l-purple-500 bg-purple-950/10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-400">Active Subscriptions</p>
            <span className="text-xl">⚡</span>
          </div>
          <p className="mt-2 text-3xl font-black text-white">{activeSubsCount}</p>
          <p className="mt-1 text-xs text-neutral-400">
            Across game top-ups & digital keys
          </p>
        </div>

        <div className="card p-5 border-l-4 border-l-amber-500 bg-amber-950/10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Credential Stock</p>
            <span className="text-xl">🔑</span>
          </div>
          <p className="mt-2 text-3xl font-black text-white">{freeCredSlots} Slots</p>
          <p className="mt-1 text-xs text-neutral-400">
            {usedCredSlots} / {totalCredSlots} total capacity assigned
          </p>
        </div>
      </div>

      {/* Two Column Grid: Signups & Sales */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* User Signups Section */}
        <div className="card p-6 space-y-4 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>👥</span> User Signups Track
              </h2>
              <p className="text-xs text-neutral-400">Latest customer registrations on Subsdealer</p>
            </div>
            <span className="badge badge-blue">{totalUsersCount} Total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-neutral-400 uppercase">
                  <th className="py-2 px-3">User / Email</th>
                  <th className="py-2 px-3">Role</th>
                  <th className="py-2 px-3">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-white">{p.full_name || "Unnamed User"}</p>
                      <p className="text-[11px] text-neutral-400">{p.email}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`badge ${p.role === 'admin' ? 'badge-red' : 'badge-gray'}`}>
                        {p.role || "user"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-400">
                      {new Date(p.created_at).toLocaleDateString("en-BD", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-neutral-500">
                      No signups recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Sales Track Section */}
        <div className="card p-6 space-y-4 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🛍️</span> Sales & Revenue Track
              </h2>
              <p className="text-xs text-neutral-400">Real-time store purchases and top-up orders</p>
            </div>
            <Link href="/admin/subscriptions" className="text-xs text-red-400 hover:underline">
              View All Orders →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-neutral-400 uppercase">
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-white">{(o.profiles as any)?.full_name || (o.profiles as any)?.email || "Customer"}</p>
                      <p className="text-[10px] text-neutral-500">
                        {new Date(o.created_at).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-400">
                      ৳{Number(o.amount_bdt || 0).toLocaleString("en-BD")}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-400 uppercase">
                      {o.payment_method || "bKash"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`badge ${
                          o.status === "completed"
                            ? "badge-green"
                            : o.status === "pending"
                            ? "badge-yellow"
                            : "badge-gray"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-neutral-500">
                      No sales recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Licenses & Credentials Supply Status */}
      <div className="card p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🔑</span> Credentials & License Keys Stock
            </h2>
            <p className="text-xs text-neutral-400">Track digital account licenses and free slot inventory</p>
          </div>
          <Link href="/admin/credentials" className="btn-secondary text-xs">
            Manage Credentials →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white/[0.03] p-4 border border-white/5">
            <p className="text-xs text-neutral-400 uppercase">Active Logins</p>
            <p className="mt-1 text-2xl font-bold text-white">{credentials.length} Logins</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-4 border border-white/5">
            <p className="text-xs text-neutral-400 uppercase">Total Team Seats</p>
            <p className="mt-1 text-2xl font-bold text-white">{teams.length} Teams</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-4 border border-white/5">
            <p className="text-xs text-neutral-400 uppercase">Wholesale Supplier API</p>
            <p className="mt-1 text-lg font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              FazerCards Active
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
