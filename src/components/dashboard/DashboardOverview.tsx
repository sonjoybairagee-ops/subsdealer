import Link from "next/link";
import { SubscriptionCard, type SubscriptionCardData } from "@/components/SubscriptionCard";
import UserEmailPortal from "@/components/UserEmailPortal";
import { formatBdt } from "@/lib/subscriptions";

interface DashboardOverviewProps {
  subscriptions: SubscriptionCardData[];
  walletBalance: number;
}

export function DashboardOverview({ subscriptions, walletBalance }: DashboardOverviewProps) {
  const active = subscriptions.filter((s) => s.status === "active" || s.status === "pending_credential");
  const past = subscriptions.filter((s) => !active.includes(s));
  const hasActiveAccess = active.length > 0;

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#ffb703] to-[#fb8500] p-6 sm:p-8 text-[#0d0f14] shadow-xl">
        <p className="text-xs font-black uppercase tracking-wider opacity-80">YOUR SUBSDEALER ACCOUNT</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">Welcome back</h1>
        <p className="mt-2 text-xs font-semibold opacity-90 sm:text-sm">
          Manage your orders, wallet balance, account details, and license keys in one place.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="rounded-xl bg-[#0d0f14]/10 backdrop-blur-md px-4 py-2">
            <span className="text-xs font-medium">Wallet Balance:</span>
            <span className="ml-2 text-lg font-black">{formatBdt(walletBalance)}</span>
          </div>
          <Link
            href="/dashboard?tab=wallet"
            className="rounded-xl bg-[#0d0f14] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-black"
          >
            + Add Funds
          </Link>
        </div>
      </div>

      {/* Shared Subscription Email & OTP Portal (Locked until Adobe subscription is purchased) */}
      {hasActiveAccess ? (
        <UserEmailPortal />
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#141722]/80 p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl">
            🔒
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Shared Email & OTP Portal Locked</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1 leading-relaxed">
              Assigned subscription email credentials, password, and live OTP codes will unlock automatically once you have an active subscription purchase (e.g. Adobe Creative Cloud).
            </p>
          </div>
          <Link
            href="/subscriptions"
            className="inline-block rounded-xl bg-[#ffb703] hover:bg-[#e0a100] px-6 py-2.5 text-xs font-bold text-[#0d0f14] shadow-lg shadow-[#ffb703]/20 transition"
          >
            Browse & Purchase Subscription →
          </Link>
        </div>
      )}

      {/* Active Subscriptions Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Active Subscriptions</h2>
          <Link href="/subscriptions" className="text-xs font-bold text-[#ffb703] hover:underline">
            Browse Catalogue →
          </Link>
        </div>

        {active.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#161922] p-8 text-center">
            <p className="text-base font-bold text-white">No active subscriptions</p>
            <p className="mt-2 text-xs text-white/60">
              Adobe Creative Cloud, Canva Pro, ChatGPT Plus and more — at local pricing.
            </p>
            <Link
              href="/subscriptions"
              className="mt-5 inline-block rounded-xl bg-[#ffb703] px-5 py-2.5 text-xs font-bold text-[#0d0f14] shadow-md shadow-[#ffb703]/20 transition hover:bg-[#e0a100]"
            >
              Browse Subscriptions →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {active.map((sub) => (
              <SubscriptionCard key={sub.id} sub={sub} />
            ))}
          </div>
        )}
      </section>

      {/* Past Subscriptions */}
      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-black text-white">Past Subscriptions</h2>
          <div className="space-y-4">
            {past.map((sub) => (
              <SubscriptionCard key={sub.id} sub={sub} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
