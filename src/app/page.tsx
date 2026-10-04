import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatBdt, discountPercent, describeDuration } from "@/lib/subscriptions";
import { ProductShowcase, type ShowcaseItem } from "@/components/ProductShowcase";
import { Reviews } from "@/components/Reviews";

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
        <div className="shell">
          <h1 className="hero-title">
            Premium tools.
            <br />
            Local prices.
          </h1>

          <p className="hero-sub">
            Canva Pro, CapCut Pro, ChatGPT Plus and more
            {cheapestOverall !== null ? ` — from ${formatBdt(cheapestOverall)}` : ""}. Paid
            with bKash, delivered to your dashboard.
          </p>

          <div className="proof-pill">
            <span className="proof-avatars">
              {[
                ["A", "#e5243b"],
                ["R", "#6aa9ff"],
                ["S", "#ffb347"],
                ["M", "#c58bff"],
              ].map(([letter, colour]) => (
                <span key={letter} style={{ background: colour }}>
                  {letter}
                </span>
              ))}
            </span>
            <span className="text-[#ffcf8c]">★★★★★</span>
            <span className="font-bold text-white">4.9</span>
            <span className="muted">· verified by hand, every order</span>
          </div>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/subscriptions" className="btn-primary">
              View plans →
            </Link>
            <Link href="#how" className="btn-secondary">
              How it works
            </Link>
          </div>

          <div className="trust-row">
            <span>
              <span className="text-[#e5243b]">⚡</span> Fast activation
            </span>
            <span>
              <span className="text-[#e5243b]">✓</span> bKash payments
            </span>
            <span>
              <span className="text-[#e5243b]">↻</span> Free replacement
            </span>
            <span>
              <span className="text-[#e5243b]">●</span> Real support
            </span>
          </div>
        </div>

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

      {/* ---------------- how ---------------- */}
      <section id="how" className="shell scroll-mt-24 py-12">
        <div className="card p-8">
          <h2 className="text-2xl font-black tracking-tight">How it works</h2>
          <ol className="mt-7 grid gap-6 sm:grid-cols-4">
            {[
              ["Pick a plan", "Choose the product and how long you want it for."],
              ["Pay with bKash", "Send money, then submit the transaction ID and a screenshot."],
              ["We verify", "By hand, usually within a few hours during the day."],
              ["Start using it", "Your login or invite appears in your dashboard."],
            ].map(([title, body], i) => (
              <li key={title}>
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e5243b]/10 font-black text-[#e5243b]">
                  {i + 1}
                </span>
                <p className="mt-3 font-bold text-white">{title}</p>
                <p className="muted mt-1 text-sm leading-6">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- faq ---------------- */}
      <section id="faq" className="shell scroll-mt-24 py-12">
        <h2 className="text-2xl font-black tracking-tight">Common questions</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            [
              "How fast is activation?",
              "Usually a few hours during the day. Every payment is checked by a person against our bKash statement before anything is handed over.",
            ],
            [
              "What if the account stops working?",
              "We replace it. Contact support and we move you to a fresh account or send a new invite — your dashboard updates straight away.",
            ],
            [
              "Do I get my own account or a shared one?",
              "It depends on the product, and each page says which. Some are invites to your own account, some are a ready-made login shared with a few other people.",
            ],
            [
              "Can I pay with anything other than bKash?",
              "Not right now. bKash keeps it simple and avoids card fees, which is part of why the prices are what they are.",
            ],
          ].map(([q, a]) => (
            <div key={q} className="card p-6">
              <h3 className="font-bold text-white">{q}</h3>
              <p className="muted mt-2 text-sm leading-6">{a}</p>
            </div>
          ))}
        </div>

        <div className="card mt-8 flex flex-wrap items-center justify-between gap-4 p-7">
          <div>
            <p className="font-black text-white">Ready to start?</p>
            <p className="muted mt-1 text-sm">
              Create an account, pick a plan, pay with bKash.
            </p>
          </div>
          <Link href="/subscriptions" className="btn-primary">
            Browse {BRAND} →
          </Link>
        </div>
      </section>

      <Reviews />
    </>
  );
}
