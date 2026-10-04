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
