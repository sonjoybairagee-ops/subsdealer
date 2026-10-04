import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubscriptionCard, type SubscriptionCardData } from "@/components/SubscriptionCard";
import {
  formatBdt,
  formatDhakaDate,
  orderStatusMeta,
  paymentMethodLabel,
  type SubOrderStatus,
} from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export default async function DashboardSubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Note what is NOT selected: nothing from sub_credentials. The card asks
  // /api/subscriptions/reveal for the login only when the customer clicks,
  // so a password never travels with the page HTML.
  const [subsRes, ordersRes] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "id, status, start_date, expiry_date, credential_id, invite_email, invited_at, sub_products(name, slug, access_type, delivery_type), sub_plans(name, duration_days), sub_teams(name)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("sub_orders")
      .select(
        "id, status, amount_bdt, method, txn_ref, created_at, reject_reason, hold_reason, sub_products(name, slug), sub_plans(name)",
      )
      .eq("user_id", user.id)
      .in("status", ["pending", "on_hold", "rejected"])
      .order("created_at", { ascending: false }),
  ]);

  const subscriptions: SubscriptionCardData[] = (subsRes.data ?? []).map((s: any) => ({
    id: s.id,
    status: s.status,
    start_date: s.start_date,
    expiry_date: s.expiry_date,
    productName: s.sub_products?.name ?? "Subscription",
    productSlug: s.sub_products?.slug ?? "",
    accessType: s.sub_products?.access_type ?? "shared",
    deliveryType: s.sub_products?.delivery_type ?? "credential",
    planName: s.sub_plans?.name ?? "Plan",
    durationDays: s.sub_plans?.duration_days ?? 30,
    hasCredential: Boolean(s.credential_id),
    invite_email: s.invite_email ?? null,
    invited_at: s.invited_at ?? null,
    teamName: s.sub_teams?.name ?? null,
  }));

  const orders = ordersRes.data ?? [];
  const active = subscriptions.filter((s) => s.status === "active" || s.status === "pending_credential");
  const past = subscriptions.filter((s) => !active.includes(s));

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="mt-2 text-3xl font-black">Subscriptions</h1>
          <p className="muted mt-2">
            Your premium tool logins, and anything waiting on verification.
          </p>
        </div>
        <Link href="/subscriptions" className="btn-primary">
          Browse subscriptions
        </Link>
      </header>

      {(subsRes.error || ordersRes.error) && (
        <div className="card border border-[#ff6b6b]/40 p-5">
          <p className="font-bold text-[#ff8c8c]">Could not load your subscriptions</p>
          <p className="muted mt-2 text-sm">
            {subsRes.error?.message ?? ordersRes.error?.message}
          </p>
        </div>
      )}

      {/* ---- payments awaiting review ---- */}
      {orders.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-black text-white">Payments</h2>
          <div className="space-y-3">
            {orders.map((o: any) => {
              const meta = orderStatusMeta(o.status as SubOrderStatus);
              return (
                <div key={o.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-white">{o.sub_products?.name}</p>
                      <span className={`badge badge-${meta.tone === "green" ? "green" : meta.tone}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="muted mt-1 text-sm">
                      {o.sub_plans?.name} · {formatBdt(o.amount_bdt)} ·{" "}
                      {paymentMethodLabel(o.method)}
                      {o.txn_ref ? ` · ${o.txn_ref}` : ""}
                    </p>
                    <p className="muted mt-1 text-xs">
                      Submitted {formatDhakaDate(o.created_at)}
                    </p>
                    {o.status === "rejected" && o.reject_reason && (
                      <p className="mt-2 text-sm text-[#ff9d9d]">{o.reject_reason}</p>
                    )}
                    {o.status === "on_hold" && o.hold_reason && (
                      <p className="mt-2 text-sm text-[#ffcf8c]">{o.hold_reason}</p>
                    )}
                  </div>

                  {o.status === "rejected" ? (
                    <Link href={`/subscriptions/${o.sub_products?.slug ?? ""}`} className="btn-secondary">
                      Try again
                    </Link>
                  ) : (
                    <p className="muted max-w-xs text-right text-xs leading-5">
                      We verify payments by hand, usually within a few hours during the day.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ---- live subscriptions ---- */}
      <section>
        <h2 className="mb-4 text-lg font-black text-white">Active</h2>
        {active.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-lg font-bold text-white">No active subscriptions</p>
            <p className="muted mx-auto mt-2 max-w-md text-sm leading-6">
              Adobe Creative Cloud, Canva Pro, ChatGPT Plus and more — at local pricing, paid
              with bKash.
            </p>
            <Link href="/subscriptions" className="btn-primary mt-6 inline-block">
              Browse subscriptions →
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {active.map((s) => (
              <SubscriptionCard key={s.id} sub={s} />
            ))}
          </div>
        )}
      </section>

      {/* ---- history ---- */}
      {past.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-black text-white">Past</h2>
          <div className="space-y-5">
            {past.map((s) => (
              <SubscriptionCard key={s.id} sub={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
