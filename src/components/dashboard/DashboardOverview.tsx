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
      {/* Top Welcome Banner (Crimson Red Theme) */}
      <div className="rounded-2xl bg-gradient-to-r from-[#e5243b] via-[#dc2626] to-[#991b1b] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-10 -mt-10 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <p className="text-xs font-black uppercase tracking-wider text-red-200">YOUR SUBSDEALER ACCOUNT</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl text-white">Welcome back</h1>
        <p className="mt-2 text-xs font-semibold text-red-100/90 sm:text-sm">
          Manage your orders, wallet balance, account details, and license keys in one place.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="rounded-xl bg-black/30 backdrop-blur-md px-4 py-2 border border-white/10">
            <span className="text-xs font-medium text-red-200">Wallet Balance:</span>
            <span className="ml-2 text-lg font-black text-white">{formatBdt(walletBalance)}</span>
          </div>
          <Link
            href="/dashboard?tab=wallet"
            className="rounded-xl bg-black hover:bg-zinc-900 border border-white/20 px-5 py-2.5 text-xs font-bold text-white transition shadow-lg"
          >
            + Add Funds
          </Link>
        </div>
      </div>

      {/* Shared Subscription Email & OTP Portal (Locked until Adobe subscription is purchased) */}
      {hasActiveAccess ? (
        <UserEmailPortal />
      ) : (
        <div className="rounded-2xl border border-red-500/20 bg-[#141722]/80 p-8 text-center space-y-4 shadow-xl">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 text-2xl">
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
            className="inline-block rounded-xl bg-gradient-to-r from-[#e5243b] to-[#b91c1c] hover:from-[#c81e33] hover:to-[#991b1b] px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#e5243b]/25 transition"
          >
            Browse & Purchase Subscription →
          </Link>
        </div>
      )}

      {/* Active Subscriptions Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Active Subscriptions</h2>
          <Link href="/subscriptions" className="text-xs font-bold text-[#ff4d6d] hover:underline">
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
              className="mt-5 inline-block rounded-xl bg-gradient-to-r from-[#e5243b] to-[#b91c1c] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#e5243b]/25 transition hover:opacity-95"
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
