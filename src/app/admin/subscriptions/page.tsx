import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SubscriptionsTable,
  type AdminSubscriptionRow,
  type TeamOption,
} from "@/components/SubscriptionsTable";
import type { CredentialOption } from "@/components/SubOrderQueue";
import { daysRemaining } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  const svc = createAdminClient();

  const [subsRes, credsRes, teamsRes, productsRes, pendingOrdersRes] = await Promise.all([
    svc
      .from("subscriptions")
      .select(
        "id, status, start_date, expiry_date, product_id, credential_id, team_id, revoked_reason, invite_email, invited_at, profiles(email, full_name), sub_products(name, delivery_type), sub_plans(name), sub_credentials(login_email), sub_teams(name)",
      )
      .order("created_at", { ascending: false })
      .limit(500),
    svc.from("sub_credential_usage").select("*").eq("status", "active"),
    svc.from("sub_team_usage").select("*"),
    svc.from("sub_products").select("id, name").order("sort_order"),
    svc.from("sub_orders").select("id", { count: "exact", head: true }).in("status", ["pending", "on_hold"]),
  ]);

  const subscriptions: AdminSubscriptionRow[] = (subsRes.data ?? []).map((s: any) => ({
    id: s.id,
    status: s.status,
    start_date: s.start_date,
    expiry_date: s.expiry_date,
    product_id: s.product_id,
    productName: s.sub_products?.name ?? "Unknown",
    deliveryType: s.sub_products?.delivery_type ?? "credential",
    invite_email: s.invite_email,
    invited_at: s.invited_at,
    planName: s.sub_plans?.name ?? "Plan",
    credential_id: s.credential_id,
    credentialEmail: s.sub_credentials?.login_email ?? null,
    team_id: s.team_id,
    teamName: s.sub_teams?.name ?? null,
    customerEmail: s.profiles?.email ?? null,
    customerName: s.profiles?.full_name ?? null,
    revoked_reason: s.revoked_reason,
  }));

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

  const teams: TeamOption[] = (teamsRes.data ?? [])
    .filter((t: any) => t.is_active)
    .map((t: any) => ({
      id: t.team_id,
      product_id: t.product_id,
      name: t.name,
      capacity: t.capacity,
      active_members: t.active_members,
    }));

  // Headline numbers — the things that actually need doing today.
  const now = new Date();
  const needsCredential = subscriptions.filter((s) => s.status === "pending_credential").length;
  const needsInvite = subscriptions.filter(
    (s) =>
      s.deliveryType === "invite" &&
      (s.status === "active" || s.status === "pending_credential") &&
      !s.invited_at,
  ).length;
  const expiringToday = subscriptions.filter(
    (s) => s.status === "active" && daysRemaining(s.expiry_date, now) <= 1,
  ).length;
  const expiring7 = subscriptions.filter(
    (s) => s.status === "active" && daysRemaining(s.expiry_date, now) <= 7,
  ).length;
  const pendingPayments = pendingOrdersRes.count ?? 0;
  const activeCount = subscriptions.filter((s) => s.status === "active").length;

  const error = subsRes.error || credsRes.error || teamsRes.error || productsRes.error;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Subscription operations</p>
          <h1 className="mt-2 text-3xl font-black">Subscriptions</h1>
          <p className="muted mt-2 max-w-2xl">
            Every subscription you have sold. Assign credentials, move people between teams,
            extend terms and revoke access.
          </p>
        </div>
        <Link href="/admin/subscriptions/payments" className="btn-primary">
          Payment queue{pendingPayments > 0 ? ` (${pendingPayments})` : ""} →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Stat label="Active" value={activeCount} />
        <Stat
          label="Payments to review"
          value={pendingPayments}
          tone={pendingPayments > 0 ? "warn" : "neutral"}
          href="/admin/subscriptions/payments"
        />
        <Stat
          label="Invites to send"
          value={needsInvite}
          tone={needsInvite > 0 ? "warn" : "neutral"}
        />
        <Stat
          label="Needs credential"
          value={needsCredential}
          tone={needsCredential > 0 ? "warn" : "neutral"}
        />
        <Stat
          label="Expiring today"
          value={expiringToday}
          tone={expiringToday > 0 ? "danger" : "neutral"}
        />
        <Stat label="Expiring in 7 days" value={expiring7} tone={expiring7 > 0 ? "warn" : "neutral"} />
      </div>

      {error && (
        <div className="card border border-[#ff6b6b]/40 p-5">
          <p className="font-bold text-[#ff8c8c]">Could not load subscriptions</p>
          <p className="muted mt-2 text-sm">{error.message}</p>
        </div>
      )}

      <SubscriptionsTable
        subscriptions={subscriptions}
        credentials={credentials}
        teams={teams}
        products={(productsRes.data ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
  href,
}: {
  label: string;
  value: number;
  tone?: "warn" | "danger" | "neutral";
  href?: string;
}) {
  const color =
    tone === "warn" ? "text-[#ffcf8c]" : tone === "danger" ? "text-[#ff9d9d]" : "text-white";
  const inner = (
    <div className="card p-4">
      <p className="muted text-xs uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
