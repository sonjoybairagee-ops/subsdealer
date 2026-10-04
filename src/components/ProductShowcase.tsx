import Link from "next/link";

export interface ShowcaseItem {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  thumbnail_url: string | null;
  category: string | null;
  delivery_type: string;
  cheapestPrice: number;
  cheapestCompareAt: number | null;
  cheapestDurationDays: number;
}

/**
 * 6-column poster cards inspired by RMT Game Shop layout:
 * Tall cover image with top-right orange badge, white footer title bar.
 */
export function ProductShowcase({ items }: { items: ShowcaseItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-5">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/subscriptions/${item.slug}`}
          className="group relative flex flex-col overflow-hidden rounded-[18px] border border-white/[.08] bg-[#121620] transition-all duration-200 hover:-translate-y-1.5 hover:border-[#e5243b]/50 hover:shadow-xl hover:shadow-[#e5243b]/10"
        >
          {/* ---- Cover Image Area (Aspect 3/4) ---- */}
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#161a25]">
            {item.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbnail_url}
                alt={item.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-black text-white/30 text-3xl">
                {item.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            {/* ---- Top-Right Orange Badge (RMT Game Shop style) ---- */}
            <span className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#f97316] text-white shadow-md">
              <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </span>
          </div>

          {/* ---- White Footer Bar ---- */}
          <div className="flex items-center justify-center bg-white px-2 py-3 text-center">
            <h3 className="line-clamp-1 text-xs font-bold text-slate-900 sm:text-sm">
              {item.name}
            </h3>
          </div>
        </Link>
      ))}
    </div>
  );
}

