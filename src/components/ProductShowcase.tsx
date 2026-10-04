import Link from "next/link";
import { describeDuration, discountPercent, formatBdt } from "@/lib/subscriptions";

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
 * Big picture cards for the home page, as opposed to the compact rows used
 * in the catalogue. Worth the extra space here because this is where someone
 * decides whether the site is worth their money.
 */
export function ProductShowcase({ items }: { items: ShowcaseItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const off = discountPercent(item.cheapestPrice, item.cheapestCompareAt);

        return (
          <article key={item.id} className="showcase-card">
            <div className="showcase-media" data-image={item.thumbnail_url ? "yes" : "no"}>
              {item.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnail_url} alt="" />
              ) : (
                <span className="showcase-initials">
                  {item.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="showcase-tag">
                {item.slug.startsWith("windows")
                  ? "Key"
                  : ["pubg", "free-fire", "mobile-legends", "genshin", "game-"].some((s) =>
                        item.slug.startsWith(s),
                      )
                    ? "Top-up"
                    : item.delivery_type === "invite"
                      ? "Invite"
                      : "Login"}
              </span>
            </div>

            <div className="showcase-body">
              <h3 className="text-lg font-black text-white">{item.name}</h3>
              {item.tagline && (
                <p className="muted mt-2 line-clamp-2 text-sm leading-6">{item.tagline}</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="badge badge-neutral">
                  {describeDuration(item.cheapestDurationDays)}
                </span>
                {off ? <span className="off-badge">−{off}%</span> : null}
              </div>

              <div className="mt-5">
                <span className="text-2xl font-black text-white">
                  {formatBdt(item.cheapestPrice)}
                </span>
                <span className="price-unit">from</span>
                {item.cheapestCompareAt && (
                  <s className="muted mt-0.5 block text-sm">
                    {formatBdt(item.cheapestCompareAt)}
                  </s>
                )}
              </div>

              <Link
                href={`/subscriptions/${item.slug}`}
                className="btn-primary mt-5 w-full justify-center"
              >
                View details
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
