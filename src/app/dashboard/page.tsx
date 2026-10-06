import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";

import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { DashboardOrders } from "@/components/dashboard/DashboardOrders";
import { DashboardWallet } from "@/components/dashboard/DashboardWallet";
import { DashboardAccountDetails } from "@/components/dashboard/DashboardAccountDetails";
import { DashboardLicenseKeys } from "@/components/dashboard/DashboardLicenseKeys";
import { ReferralDashboardCard } from "@/components/dashboard/ReferralDashboardCard";
import { type SubscriptionCardData } from "@/components/SubscriptionCard";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const activeTab = params.tab || "overview";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getProfile();
  const adminClient = createAdminClient();

  // Fetch Wallet Balance & Transactions using Admin Client (bypassing client table restricts safely on server)
  const [walletRes, walletTxnsRes, subsRes, ordersRes, licenseKeysRes] = await Promise.all([
    adminClient
      .from("user_wallets")
      .select("balance_bdt")
      .eq("user_id", user.id)
      .maybeSingle(),
    adminClient
      .from("wallet_transactions")
      .select("id, amount_bdt, type, balance_after, method, sender_number, txn_ref, status, reject_reason, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
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
      .order("created_at", { ascending: false }),
    adminClient
      .from("license_keys")
      .select("id, order_id, assigned_at, sub_products(name)")
      .eq("user_id", user.id)
      .eq("status", "assigned")
      .order("assigned_at", { ascending: false }),
  ]);

  const walletBalance = Number(walletRes.data?.balance_bdt || 0);
  const walletTransactions = (walletTxnsRes.data || []).map((t: any) => ({
    ...t,
    amount_bdt: Number(t.amount_bdt),
    balance_after: Number(t.balance_after),
  }));

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

  const orders = (ordersRes.data ?? []).map((o: any) => ({
    ...o,
    amount_bdt: Number(o.amount_bdt),
  }));

  const licenseKeys = (licenseKeysRes.data ?? []).map((k: any) => ({
    id: k.id,
    order_id: k.order_id,
    product_name: k.sub_products?.name || "Product",
    assigned_at: k.assigned_at,
  }));

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Sidebar Component */}
      <DashboardSidebar profile={profile} activeTab={activeTab} />

      {/* Main Tab Content */}
      <main className="flex-1 w-full min-w-0">
        {activeTab === "overview" && (
          <DashboardOverview subscriptions={subscriptions} walletBalance={walletBalance} />
        )}
        {activeTab === "orders" && <DashboardOrders orders={orders} />}
        {activeTab === "wallet" && (
          <DashboardWallet balance={walletBalance} transactions={walletTransactions} />
        )}
        {activeTab === "account" && <DashboardAccountDetails profile={profile} />}
        {activeTab === "license-key" && <DashboardLicenseKeys keys={licenseKeys} />}
        {activeTab === "referral" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-black text-white">Referral & Affiliate Program</h1>
            <ReferralDashboardCard />
          </div>
        )}
        {!["overview", "orders", "wallet", "account", "license-key", "referral"].includes(activeTab) && (
          <DashboardOverview subscriptions={subscriptions} walletBalance={walletBalance} />
        )}
      </main>
    </div>
  );
}
