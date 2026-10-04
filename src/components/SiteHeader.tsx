import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";
import { LogoTile } from "@/components/Logo";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Subsdealer";

const NAV = [
  ["/subscriptions", "Subscriptions"],
  ["/subscriptions?category=ai", "AI"],
  ["/subscriptions?category=games", "Game Top-Up"],
];

export async function SiteHeader() {
  const profile = await getProfile();
  const isAdmin = profile?.role === "admin";

  return (
    <header className="site-header">
      <div className="shell site-header-inner">
        <Link href="/" className="brand" aria-label={`${BRAND} home`}>
          <LogoTile />
          <span>{BRAND}</span>
        </Link>

        {/* Middle Search Input (RMT Game Shop style) */}
        <form action="/subscriptions" method="GET" className="relative hidden max-w-xs flex-1 md:block">
          <input
            type="text"
            name="q"
            placeholder="Search products (Canva, PUBG, ChatGPT)..."
            className="w-full rounded-full border border-white/10 bg-white/[.05] py-2 pl-9 pr-4 text-xs text-white placeholder-white/40 transition focus:border-[#e5243b] focus:bg-white/[.08] focus:outline-none"
          />
          <svg
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 fill-none stroke-white/40 stroke-2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </form>

        <nav className="site-nav" aria-label="Main navigation">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {profile ? (
            <>
              {isAdmin && (
                <Link href="/admin" className="btn-secondary">
                  Admin
                </Link>
              )}
              <Link href="/dashboard" className="btn-primary">
                My subscriptions
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">
                Sign in
              </Link>
              <Link href="/subscriptions" className="btn-primary">
                Browse
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
