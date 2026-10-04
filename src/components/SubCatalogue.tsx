"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { describeDuration, discountPercent, formatBdt } from "@/lib/subscriptions";

export interface CatalogueProduct {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  thumbnail_url: string | null;
  category: string | null;
  delivery_type: string;
  features: string[];
  cheapestPrice: number;
  cheapestCompareAt: number | null;
  cheapestDurationDays: number;
  planCount: number;
}

type View = "list" | "grid";

// Pretty names + display order for categories. Anything not listed falls back
// to a capitalised version of its key and sorts to the end.
const CAT_LABELS: Record<string, string> = {
  ai: "AI",
  design: "Design",
  video: "Video",
  productivity: "Productivity",
  education: "Education",
  software: "Software",
  games: "Games",
  other: "Other",
};
const CAT_ORDER = [
  "ai",
  "design",
  "video",
  "productivity",
  "education",
  "software",
  "games",
  "other",
];

function catLabel(key: string) {
  return CAT_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}
function catRank(key: string) {
  const i = CAT_ORDER.indexOf(key);
  return i === -1 ? CAT_ORDER.length : i;
}

export function SubCatalogue({
  products,
  initialCategory = "all",
}: {
  products: CatalogueProduct[];
  initialCategory?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [view, setView] = useState<View>("list");

  // Counts come from the full list, not the filtered one — a chip that said
  // "AI 0" after you picked another category would be useless.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const key = p.category || "other";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [
      { key: "all", label: "All", count: products.length },
      ...Array.from(counts.entries())
        .sort((a, b) => catRank(a[0]) - catRank(b[0]))
        .map(([key, count]) => ({ key, label: catLabel(key), count })),
    ];
  }, [products]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== "all" && (p.category || "other") !== category) return false;
      if (!needle) return true;
      const hay = `${p.name} ${p.tagline ?? ""} ${p.features.join(" ")}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [products, query, category]);

  // Group into category sections only on the unfiltered "All" view. Once the
  // person picks a category or searches, a flat list reads better.
  const grouped = useMemo(() => {
    const map = new Map<string, CatalogueProduct[]>();
    for (const p of visible) {
      const key = p.category || "other";
      (map.get(key) ?? map.set(key, []).get(key)!).push(p);
    }
    return Array.from(map.entries()).sort((a, b) => catRank(a[0]) - catRank(b[0]));
  }, [visible]);

  const showGroups = category === "all" && query.trim() === "";

  return (
    <div>
      {/* ---- search ---- */}
      <div className="search-wrap">
        <span className="search-icon">⌕</span>
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Canva, CapCut, ChatGPT…"
          aria-label="Search subscriptions"
        />
      </div>

      {/* ---- chips + view toggle ---- */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="muted text-[11px] font-bold uppercase tracking-[0.1em]">
          Browse
        </span>

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              className="chip"
              aria-pressed={category === c.key}
              onClick={() => setCategory(c.key)}
            >
              {c.label}
              <span className="chip-count">{c.count}</span>
            </button>
          ))}
        </div>

        <div className="view-toggle ml-auto" role="group" aria-label="Change layout">
          <button
            type="button"
            aria-pressed={view === "grid"}
            aria-label="Grid view"
            onClick={() => setView("grid")}
          >
            ▦
          </button>
          <button
            type="button"
            aria-pressed={view === "list"}
            aria-label="List view"
            onClick={() => setView("list")}
          >
            ☰
          </button>
        </div>
      </div>

      {/* ---- results ---- */}
      {visible.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="font-bold text-white">Nothing matches</p>
          <p className="muted mt-2 text-sm">
            Try a different word, or clear the filter.
          </p>
          <button
            className="btn-secondary mt-5"
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : showGroups ? (
        <div className="mt-7 space-y-10">
          {grouped.map(([key, items]) => (
            <section key={key}>
              <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-black text-white">{catLabel(key)}</h2>
                <span className="muted text-sm">
                  {items.length} product{items.length === 1 ? "" : "s"}
                </span>
              </div>
              {view === "list" ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {items.map((p) => (
                    <ProductRow key={p.id} product={p} />
                  ))}
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : view === "list" ? (
        <div className="mt-7 grid gap-3 lg:grid-cols-2">
          {visible.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <p className="muted mt-6 text-sm">
        Showing {visible.length} of {products.length}
      </p>
    </div>
  );
}

function ProductRow({ product }: { product: CatalogueProduct }) {
  const off = discountPercent(product.cheapestPrice, product.cheapestCompareAt);

  return (
    <Link href={`/subscriptions/${product.slug}`} className="product-row">
      <span className="product-logo" data-image={product.thumbnail_url ? "yes" : "no"}>
        {product.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.thumbnail_url} alt="" />
        ) : (
          product.name.slice(0, 2).toUpperCase()
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <b className="text-[15px] font-bold text-white">{product.name}</b>
          {off ? <span className="off-badge">−{off}%</span> : null}
        </span>
        <span className="mt-1.5 block">
          <span className="price-now">{formatBdt(product.cheapestPrice)}</span>
          <span className="price-unit">
            {describeDuration(product.cheapestDurationDays)}
          </span>
          {product.cheapestCompareAt && (
            <span className="price-was">{formatBdt(product.cheapestCompareAt)}</span>
          )}
        </span>
      </span>

      <span className="product-row-go">→</span>
    </Link>
  );
}

function ProductCard({ product }: { product: CatalogueProduct }) {
  const off = discountPercent(product.cheapestPrice, product.cheapestCompareAt);

  return (
    <Link href={`/subscriptions/${product.slug}`} className="card card-hover flex flex-col p-6">
      <div className="flex items-start gap-4">
        <span className="product-logo" data-image={product.thumbnail_url ? "yes" : "no"}>
          {product.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.thumbnail_url} alt="" />
          ) : (
            product.name.slice(0, 2).toUpperCase()
          )}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-white">{product.name}</h3>
            {off ? <span className="off-badge">−{off}%</span> : null}
          </div>
          {product.tagline && (
            <p className="muted mt-1 text-sm leading-6">{product.tagline}</p>
          )}
        </div>
      </div>

      {product.features.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {product.features.slice(0, 3).map((f) => (
            <li key={f} className="flex gap-2 text-sm text-[#c7ccd6]">
              <span className="shrink-0 text-[#ff7585]">✓</span>
              <span className="min-w-0 truncate">{f}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-white/[.06] pt-5">
        <div>
          <p className="muted text-xs">
            From · {describeDuration(product.cheapestDurationDays)}
          </p>
          <p className="text-2xl font-black text-[#e5243b]">
            {formatBdt(product.cheapestPrice)}
          </p>
        </div>
        <span className="text-sm font-bold text-[#e5243b]">
          {product.planCount} plan{product.planCount === 1 ? "" : "s"} →
        </span>
      </div>
    </Link>
  );
}
