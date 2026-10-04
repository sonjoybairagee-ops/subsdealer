import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SubCatalogue, type CatalogueProduct } from "@/components/SubCatalogue";

export const dynamic = "force-dynamic";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Subsdealer";

export const metadata: Metadata = {
  title: "Subscriptions",
  description:
    "Canva Pro, CapCut Pro, ChatGPT Plus and more at Bangladesh pricing. Pay with bKash, get access in hours.",
};

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: initialCategory } = await searchParams;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sub_products")
    .select(
      "id, slug, name, tagline, thumbnail_url, category, access_type, delivery_type, features, sub_plans(id, name, duration_days, price_bdt, compare_at_bdt, is_active, sort_order)",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // A product with no live plan cannot be bought, so it should not be listed.
  const products: CatalogueProduct[] = (data ?? [])
    .map((p: any) => {
      const plans = (p.sub_plans ?? []).filter((pl: any) => pl.is_active);
      if (plans.length === 0) return null;

      const cheapest = plans.reduce((min: any, pl: any) =>
        Number(pl.price_bdt) < Number(min.price_bdt) ? pl : min,
      );

function inferCategory(p: any): string {
  if (p.category && p.category !== "other") return p.category;
  const s = (p.slug || "").toLowerCase();
  const n = (p.name || "").toLowerCase();
  if (["pubg", "free-fire", "mobile-legends", "genshin", "delta-force", "valorant", "farlight"].some((k) => s.includes(k) || n.includes(k))) {
    return "games";
  }
  if (["gta", "rdr2", "red-dead", "steam", "key"].some((k) => s.includes(k) || n.includes(k))) {
    return "game_keys";
  }
  if (["chatgpt", "leonardo", "midjourney", "claude", "ai"].some((k) => s.includes(k) || n.includes(k))) {
    return "ai";
  }
  if (["canva", "figma", "adobe", "freepik", "design"].some((k) => s.includes(k) || n.includes(k))) {
    return "design";
  }
  if (["capcut", "premiere", "video"].some((k) => s.includes(k) || n.includes(k))) {
    return "video";
  }
  if (["windows", "office", "software"].some((k) => s.includes(k) || n.includes(k))) {
    return "software";
  }
  return "other";
}

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        thumbnail_url: p.thumbnail_url || `/products/${p.slug}.png`,
        category: inferCategory(p),
        delivery_type: p.delivery_type ?? "credential",
        features: Array.isArray(p.features) ? p.features : [],
        cheapestPrice: Number(cheapest.price_bdt),
        cheapestCompareAt: cheapest.compare_at_bdt ? Number(cheapest.compare_at_bdt) : null,
        cheapestDurationDays: cheapest.duration_days,
        planCount: plans.length,
      } satisfies CatalogueProduct;
    })
    .filter(Boolean) as CatalogueProduct[];

  return (
    <div className="shell py-14">
      <header className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Catalogue</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          Every subscription we sell
        </h1>
        <p className="muted mt-4 text-lg leading-8">
          Pay with bKash. We verify the payment, hand over access, and replace it free if
          it ever stops working.
        </p>
      </header>

      {error && (
        <div className="card mt-10 border border-[#ff6b6b]/40 p-5">
          <p className="font-bold text-[#ff8c8c]">Could not load the catalogue</p>
          <p className="muted mt-2 text-sm">{error.message}</p>
          <p className="muted mt-2 text-sm">
            If this mentions a missing relation, the database setup has not been run yet —
            see <code className="text-[#e5243b]">RUN-THIS-IN-SUPABASE.sql</code>.
          </p>
        </div>
      )}

      {!error && products.length === 0 ? (
        <div className="card mt-10 p-10 text-center">
          <p className="text-lg font-bold text-white">Nothing on sale just yet</p>
          <p className="muted mx-auto mt-2 max-w-md text-sm leading-6">
            New subscriptions are being added. Check back shortly, or tell us what you are
            looking for.
          </p>
          <Link href="/contact" className="btn-secondary mt-6 inline-block">
            Contact us
          </Link>
        </div>
      ) : (
        <div className="mt-11">
          <SubCatalogue products={products} initialCategory={initialCategory ?? "all"} />
        </div>
      )}

      <section className="card mt-14 p-7">
        <h2 className="text-xl font-black">How buying from {BRAND} works</h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-4">
          {[
            ["Pick a plan", "Choose the product and how long you want it for."],
            ["Pay with bKash", "Send money, then submit the transaction ID and a screenshot."],
            ["We verify", "Usually within a few hours during the day."],
            ["Start using it", "Your login or invite appears in your dashboard."],
          ].map(([title, body], i) => (
            <li key={title}>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e5243b]/10 font-black text-[#e5243b]">
                {i + 1}
              </span>
              <p className="mt-3 font-bold text-white">{title}</p>
              <p className="muted mt-1 text-sm leading-6">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
