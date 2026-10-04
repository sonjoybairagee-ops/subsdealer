import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SetupNotice } from "@/components/SetupNotice";
import { MetaPixel } from "@/components/MetaPixel";
import { checkConfig } from "@/lib/config";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Subsdealer";

export const metadata: Metadata = {
  title: {
    default: `${BRAND} — Premium subscriptions, local pricing`,
    template: `%s — ${BRAND}`,
  },
  description:
    "Canva Pro, CapCut Pro, ChatGPT Plus and more at Bangladesh pricing. Pay with bKash, get access in hours.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Checked here rather than per-page: the header itself reads the session, so
  // without this guard a missing key crashes before any page can explain why.
  const config = checkConfig();

  if (!config.ok) {
    return (
      <html lang="en">
        <body>
          <SetupNotice missing={config.missing} />
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>
        <MetaPixel />
        <SiteHeader />
        <main className="min-h-[70vh]">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
