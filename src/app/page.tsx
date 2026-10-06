import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatBdt, discountPercent, describeDuration, getProductThumbnail, sortGameProducts } from "@/lib/subscriptions";
import { ProductShowcase, type ShowcaseItem } from "@/components/ProductShowcase";
import { Reviews } from "@/components/Reviews";
import { HeroSlider } from "@/components/HeroSlider";

export const dynamic = "force-dynamic";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Subsdealer";

// Home page sections, in the order they appear. Game Top-Up first, then the
// subscription-style categories. A category with no products is skipped.
const HOME_SECTIONS = [
  { key: "games", label: "Game Top-Up", icon: "🎮" },
  { key: "game_keys", label: "Game Keys", icon: "🔑" },
  { key: "ai", label: "AI Tools", icon: "🤖" },
  { key: "design", label: "Design", icon: "🎨" },
  { key: "video", label: "Video", icon: "🎬" },
  { key: "productivity", label: "Productivity", icon: "📊" },
  { key: "education", label: "Education", icon: "📚" },
  { key: "software", label: "Software", icon: "💻" },
  { key: "other", label: "More", icon: "✨" },
];

export default async function HomePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("sub_products")
    .select(
      "id, slug, name, tagline, thumbnail_url, delivery_type, sub_plans(id, duration_days, price_bdt, compare_at_bdt, is_active)",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const products = (data ?? []).filter((p: any) =>
    (p.sub_plans ?? []).some((pl: any) => pl.is_active),
  );

  // Cheapest live plan across the catalogue, for the "from ৳X" line. Falls
  // back quietly when nothing is set up yet.
  const cheapestOverall = products
    .flatMap((p: any) => (p.sub_plans ?? []).filter((pl: any) => pl.is_active))
    .reduce((min: number | null, pl: any) => {
      const v = Number(pl.price_bdt);
      return min === null || v < min ? v : min;
    }, null as number | null);

  // The marquee needs the list twice so the loop is seamless.
  const marquee = products.length > 0 ? [...products, ...products] : [];

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

  const showcase: ShowcaseItem[] = products.map((p: any) => {
    const plans = (p.sub_plans ?? []).filter((pl: any) => pl.is_active);
    const cheapest = plans.reduce((min: any, pl: any) =>
      Number(pl.price_bdt) < Number(min.price_bdt) ? pl : min,
    );
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      thumbnail_url: getProductThumbnail(p.slug, p.thumbnail_url),
      category: inferCategory(p),
      delivery_type: p.delivery_type ?? "credential",
      cheapestPrice: Number(cheapest.price_bdt),
      cheapestCompareAt: cheapest.compare_at_bdt ? Number(cheapest.compare_at_bdt) : null,
      cheapestDurationDays: cheapest.duration_days,
    };
  });

  return (
    <>
      {/* ---------------- hero section (Full-width Peek Carousel) ---------------- */}
      <section className="hero">
        <div className="shell w-full overflow-hidden">
          <HeroSlider />
        </div>
      </section>

        {/* brand marquee */}
        {marquee.length > 0 && (
          <div className="marquee mt-10" aria-hidden="true">
            <div className="marquee-track">
              {marquee.map((p: any, i: number) => (
                <span key={`${p.id}-${i}`} className="marquee-item">
                  <span className="marquee-logo">
                    {p.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.thumbnail_url}
                        alt=""
                        className="h-full w-full rounded-[7px] object-cover"
                      />
                    ) : (
                      p.name.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

      {/* ---------------- Category Filter Bar (RMT Game Shop style) ---------------- */}
      {products.length > 0 && (
        <section className="shell -mt-2">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <Link
              href="/subscriptions"
              className="group flex items-center gap-2 rounded-full border border-[#e5243b] bg-[#e5243b]/10 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#e5243b] sm:text-sm"
            >
              <span>🔥</span>
              <span>All Products</span>
            </Link>

            {HOME_SECTIONS.filter((s) =>
              showcase.some((p) => (p.category ?? "other") === s.key),
            ).map((s) => (
              <Link
                key={s.key}
                href={`/subscriptions?category=${s.key}`}
                className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-4 py-2 text-xs font-bold text-white/80 transition hover:border-[#e5243b]/50 hover:bg-white/[.08] hover:text-white sm:text-sm"
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- featured products (6-column poster cards) ---------------- */}
      <section className="shell py-12">
        {products.length === 0 ? (
          <div className="card mt-8 p-10 text-center">
            <p className="font-bold text-white">Catalogue is being set up</p>
            <p className="muted mx-auto mt-2 max-w-md text-sm leading-6">
              If you are the admin, add products under{" "}
              <Link href="/admin/sub-products" className="text-[#e5243b] underline">
                Products &amp; plans
              </Link>
              . If the page reports a missing table, the database setup has not been run yet.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {HOME_SECTIONS.map(({ key, label }) => {
              let items = showcase.filter((p) => (p.category ?? "other") === key);
              if (items.length === 0) return null;
              if (key === "games") {
                items = sortGameProducts(items);
              }
              return (
                <div key={key}>
                  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                      {label}
                    </h2>
                    <Link
                      href={`/subscriptions?category=${key}`}
                      className="text-xs font-bold text-[#e5243b] transition hover:underline sm:text-sm"
                    >
                      See all →
                    </Link>
                  </div>
                  <div className="mt-6">
                    <ProductShowcase items={items.slice(0, 12)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------------- Why Subsdealer? (RMT Game Shop Trust Cards) ---------------- */}
      <section className="shell py-10 border-t border-white/10">
        <div className="text-center">
          <h2 className="text-2xl font-black text-white">কেন {BRAND}?</h2>
          <p className="muted mt-1 text-sm">বাংলাদেশের সবচেয়ে বিশ্বস্ত ডিজিটাল সার্ভিস ও গেম টপ-আপ শপ</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["💰", "বাংলাদেশে সবচেয়ে কম দাম", "ন্যায্য মূল্যে প্রিমিয়াম ডিজিটাল টুলস ও গেম টপ-আপ"],
            ["⚡", "২-৫ মিনিটে ডেলিভারি", "অর্ডার পাওয়ার সাথে সাথে দ্রুত অ্যাক্টিভেশন"],
            ["💳", "বিকাশ ও নগদ পেমেন্ট", "সহজ ও নিরাপদ লোকাল পেমেন্ট মেথড"],
            ["💬", "২৪/৭ সাপোর্ট", "যেকোনো সমস্যায় সাহায্য করার জন্য আমাদের রিয়েল টিম"],
          ].map(([icon, title, desc]) => (
            <div
              key={title}
              className="flex flex-col items-center rounded-2xl border border-white/[.08] bg-white/[.02] p-6 text-center transition hover:border-[#e5243b]/40 hover:bg-white/[.04]"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#e5243b]/10 text-2xl">
                {icon}
              </span>
              <h3 className="mt-4 font-bold text-white">{title}</h3>
              <p className="muted mt-2 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Reviews />
    </>
  );
}
