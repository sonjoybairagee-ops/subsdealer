import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubOrderQueue, type QueueOrder, type CredentialOption } from "@/components/SubOrderQueue";

export const dynamic = "force-dynamic";

const TABS = ["pending", "on_hold", "approved", "rejected"] as const;

export default async function SubPaymentsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const status = (TABS as readonly string[]).includes(searchParams.status ?? "")
    ? searchParams.status!
    : "pending";
  const q = searchParams.q?.trim() ?? "";

  const svc = createAdminClient();
  const orderBy = status === "approved" || status === "rejected" ? "reviewed_at" : "created_at";

  let query = svc
    .from("sub_orders")
    // profiles is named through the constraint on purpose: sub_orders has two
    // foreign keys to profiles (user_id and reviewed_by), so a bare
    // profiles(...) embed is ambiguous and PostgREST refuses it.
    .select(
      "id, status, amount_bdt, method, txn_ref, sender_number, receipt_path, created_at, hold_reason, reject_reason, invite_email, product_id, profiles!sub_orders_user_id_fkey(email, full_name), sub_products(name, delivery_type), sub_plans(name, duration_days)",
    )
    .eq("status", status)
    .order(orderBy, { ascending: false })
    .limit(200);

  if (q) query = query.ilike("txn_ref", `%${q}%`);

  const [ordersRes, credsRes, countsRes] = await Promise.all([
    query,
    svc.from("sub_credential_usage").select("*").eq("status", "active"),
    svc.from("sub_orders").select("status"),
  ]);

  const orders: QueueOrder[] = (ordersRes.data ?? []).map((o: any) => ({
    id: o.id,
    status: o.status,
    amount_bdt: Number(o.amount_bdt),
    method: o.method,
    txn_ref: o.txn_ref,
    sender_number: o.sender_number,
    receipt_path: o.receipt_path,
    created_at: o.created_at,
    hold_reason: o.hold_reason,
    reject_reason: o.reject_reason,
    invite_email: o.invite_email,
    product_id: o.product_id,
    productName: o.sub_products?.name ?? "Unknown product",
    deliveryType: o.sub_products?.delivery_type ?? "credential",
    planName: o.sub_plans?.name ?? "Plan",
    durationDays: o.sub_plans?.duration_days ?? 30,
    customerEmail: o.profiles?.email ?? null,
    customerName: o.profiles?.full_name ?? null,
  }));

  // Only offer credentials that still have room — approving onto a full one
  // just bounces off the CREDENTIAL_FULL check in the RPC.
  const credentials: CredentialOption[] = (credsRes.data ?? [])
    .filter((c: any) => c.free_slots > 0)
    .map((c: any) => ({
      credential_id: c.credential_id,
      product_id: c.product_id,
      login_email: c.login_email,
      label: c.label,
      active_users: c.active_users,
      max_users: c.max_users,
      free_slots: c.free_slots,
    }));

  const counts = (countsRes.data ?? []).reduce<Record<string, number>>((acc, r: any) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Manual verification</p>
          <h1 className="mt-2 text-3xl font-black">Subscription payments</h1>
          <p className="muted mt-2 max-w-2xl">
            Check the transaction against your bKash statement, then approve. Approving assigns
            a credential and starts the clock immediately.
          </p>
        </div>
        <form action="/admin/subscriptions/payments" className="flex items-center gap-2">
          <input type="hidden" name="status" value={status} />
          <input
            name="q"
            defaultValue={q}
            className="input !mt-0 w-[240px]"
            placeholder="Search transaction ID…"
          />
        </form>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={`/admin/subscriptions/payments?status=${tab}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              status === tab
                ? "bg-[#e5243b] text-black"
                : "bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            {tab === "on_hold" ? "On hold" : tab}
            {counts[tab] ? ` (${counts[tab]})` : ""}
          </Link>
        ))}
        <Link
          href="/admin/subscriptions"
          className="ml-auto rounded-full bg-white/5 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/10"
        >
          All subscriptions →
        </Link>
      </div>

      {(ordersRes.error || credsRes.error) && (
        <div className="card mt-6 border border-[#ff6b6b]/40 p-5">
          <p className="font-bold text-[#ff8c8c]">Could not load orders</p>
          <p className="muted mt-2 text-sm">{ordersRes.error?.message ?? credsRes.error?.message}</p>
        </div>
      )}

      <div className="mt-6">
        <SubOrderQueue orders={orders} credentials={credentials} />
      </div>
    </div>
  );
}
