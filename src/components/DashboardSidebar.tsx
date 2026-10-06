"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export interface DashboardSidebarProps {
  profile: {
    display_name?: string | null;
    full_name?: string | null;
    email?: string | null;
  } | null;
  activeTab: string;
}

export function DashboardSidebar({ profile, activeTab }: DashboardSidebarProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    profile?.email?.split("@")[0] ||
    "User";

  const email = profile?.email || "";

  const navItems = [
    {
      id: "overview",
      label: "Dashboard",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: "orders",
      label: "Orders",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "wallet",
      label: "My Wallet",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "account",
      label: "Account details",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: "license-key",
      label: "License Key",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-full lg:w-72 flex-shrink-0 space-y-4">
      {/* User Card & Sidebar Container */}
      <div className="rounded-2xl border border-white/10 bg-[#161922] p-5 shadow-xl">
        {/* Profile Header */}
        <div className="mb-6 border-b border-white/10 pb-5">
          <h2 className="truncate text-base font-bold text-white">{displayName}</h2>
          <p className="truncate text-xs text-white/50">{email}</p>
        </div>

        {/* Navigation Grid */}
        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <Link
                key={item.id}
                href={`/dashboard?tab=${item.id}`}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold transition ${
                  isActive
                    ? "bg-gradient-to-r from-[#e5243b] to-[#b91c1c] text-white shadow-lg shadow-[#e5243b]/25"
                    : "bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <span className={isActive ? "text-white" : "text-white/60"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Logout Button */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3 text-xs font-semibold text-white/80 transition hover:bg-red-500/20 hover:text-red-400 cursor-pointer"
          >
            <svg className="h-4 w-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </nav>

        {/* Need Help Box (Red Theme) */}
        <div className="mt-6 rounded-xl bg-[#0d0f14] border border-[#e5243b]/20 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e5243b] text-white shadow-md shadow-[#e5243b]/30">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold">Need help?</p>
              <a
                href="https://wa.me/8801700000000"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#ff4d6d] hover:text-white hover:underline"
              >
                Chat with support →
              </a>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
