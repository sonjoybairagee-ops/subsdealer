import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatBdt, discountPercent, describeDuration } from "@/lib/subscriptions";
import { ProductShowcase, type ShowcaseItem } from "@/components/ProductShowcase";
import { Reviews } from "@/components/Reviews";
import { HeroSlider } from "@/components/HeroSlider";

export const dynamic = "force-dynamic";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Subsdealer";

// Home page sections, in the order they appear. Game Top-Up first, then the
// subscription-style categories. A category with no products is skipped.
const HOME_SECTIONS = [
  { key: "games", label: "Game Top-Up", icon: "🎮" },
  { key: "ai", label: "AI Tools", icon: "🤖" },
  { key: "design", label: "Design", icon: "🎨" },
  { key: "video", label: "Video", icon: "🎬" },
  { key: "productivity", label: "Productivity", icon: "📊" },
  { key: "education", label: "Education", icon: "📚" },
  { key: "software", label: "Software & Keys", icon: "🔑" },
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
      thumbnail_url: p.thumbnail_url,
      category: p.category ?? "other",
      delivery_type: p.delivery_type ?? "credential",
      cheapestPrice: Number(cheapest.price_bdt),
      cheapestCompareAt: cheapest.compare_at_bdt ? Number(cheapest.compare_at_bdt) : null,
      cheapestDurationDays: cheapest.duration_days,
    };
  });

  return (
    <>
      {/* ---------------- hero ---------------- */}
      <section className="hero">
        {/* hero slider at the top */}
        <HeroSlider />

        {/* brand marquee */}
        {marquee.length > 0 && (
          <div className="marquee mt-16" aria-hidden="true">
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
      </section>

      {/* ---------------- category quick-links ---------------- */}
      {products.length > 0 && (
        <section className="shell -mt-6">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {HOME_SECTIONS.filter((s) =>
              showcase.some((p) => (p.category ?? "other") === s.key),
            ).map((s) => (
              <Link
                key={s.key}
                href={`/subscriptions?category=${s.key}`}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-white/[.08] bg-white/[.02] px-3 py-5 text-center transition hover:border-[#e5243b]/50 hover:bg-white/[.04]"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#e5243b]/[.12] text-2xl">
                  {s.icon}
                </span>
                <span className="text-xs font-bold text-white sm:text-sm">{s.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- featured products ---------------- */}
      <section className="shell py-16">
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
          <div className="space-y-14">
            {HOME_SECTIONS.map(({ key, label }) => {
              const items = showcase.filter((p) => (p.category ?? "other") === key);
              if (items.length === 0) return null;
              return (
                <div key={key}>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">{label}</h2>
                      <p className="muted mt-2">Pick a product to see every plan and price.</p>
                    </div>
                    <Link href={`/subscriptions?category=${key}`} className="btn-secondary">
                      See all
                    </Link>
                  </div>
                  <div className="mt-8">
                    <ProductShowcase items={items.slice(0, 6)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>




      <Reviews />
    </>
  );
}
