"use client";

import Link from "next/link";
import { useState } from "react";
import { RegionModal, type RegionModalGroup, type RegionOption } from "./RegionModal";

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
 * Multi-region game configuration.
 * When multiple region variants exist, they get grouped under a single card on the grid.
 */
const MULTI_REGION_GAMES: Record<
  string,
  {
    groupTitle: string;
    parentSlug: string;
    parentName: string;
    options: Record<string, { regionLabel: string; flag: string }>;
  }
> = {
  valorant: {
    groupTitle: "VALORANT",
    parentSlug: "valorant",
    parentName: "Valorant",
    options: {
      valorant: { regionLabel: "Singapore", flag: "🇸🇬" },
      "valorant-my": { regionLabel: "Malaysia", flag: "🇲🇾" },
    },
  },
  "capcut-pro": {
    groupTitle: "CapCut Pro",
    parentSlug: "capcut-pro",
    parentName: "CapCut Pro",
    options: {
      "capcut-pro": { regionLabel: "Shared (1 Device)", flag: "👤" },
      "capcut-pro-private": { regionLabel: "Private Account", flag: "👑" },
    },
  },
};

export function ProductShowcase({ items }: { items: ShowcaseItem[] }) {
  const [activeGroup, setActiveGroup] = useState<RegionModalGroup | null>(null);

  if (items.length === 0) return null;

  // Process items to group multi-region games into a single parent card
  const processedItems: {
    item: ShowcaseItem;
    isMultiRegion: boolean;
    groupData?: RegionModalGroup;
  }[] = [];

  const handledSlugs = new Set<string>();

  for (const item of items) {
    if (handledSlugs.has(item.slug)) continue;

    // Check if this item belongs to a multi-region group (e.g. valorant)
    let matchedGroupKey: string | null = null;
    for (const key of Object.keys(MULTI_REGION_GAMES)) {
      if (item.slug === key || item.slug.startsWith(`${key}-`)) {
        matchedGroupKey = key;
        break;
      }
    }

    if (matchedGroupKey) {
      const config = MULTI_REGION_GAMES[matchedGroupKey];
      // Gather all region variants present in items
      const regionVariants = items.filter(
        (i) => i.slug === matchedGroupKey || i.slug.startsWith(`${matchedGroupKey}-`),
      );

      // Mark all gathered variants as handled
      regionVariants.forEach((v) => handledSlugs.add(v.slug));

      if (regionVariants.length > 1) {
        const regionOptions: RegionOption[] = regionVariants.map((v) => {
          const optConfig = config.options[v.slug];
          return {
            slug: v.slug,
            name: v.name,
            regionLabel: optConfig?.regionLabel || v.name,
            flag: optConfig?.flag || "🌐",
            thumbnail_url: v.thumbnail_url || `/products/${v.slug}.png`,
            cheapestPrice: v.cheapestPrice,
          };
        });

        // Use the primary item (e.g. valorant) or first variant as card display
        const mainCardItem =
          regionVariants.find((v) => v.slug === matchedGroupKey) || regionVariants[0];

        processedItems.push({
          item: mainCardItem,
          isMultiRegion: true,
          groupData: {
            title: config.groupTitle,
            options: regionOptions,
          },
        });
        continue;
      }
    }

    // Single region product
    handledSlugs.add(item.slug);
    processedItems.push({
      item,
      isMultiRegion: false,
    });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-5">
        {processedItems.map(({ item, isMultiRegion, groupData }) => {
          const cardContent = (
            <div className="group relative flex flex-col overflow-hidden rounded-[18px] border border-white/[.08] bg-[#121620] transition-all duration-200 hover:-translate-y-1.5 hover:border-[#e5243b]/50 hover:shadow-xl hover:shadow-[#e5243b]/10 cursor-pointer">
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

                {/* Multi-Region Badge */}
                {isMultiRegion ? (
                  <span className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/80 px-2.5 py-1 text-[10px] font-black uppercase text-amber-400 border border-amber-400/30 backdrop-blur-md">
                    🌐 Multi-Region
                  </span>
                ) : null}

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
                  {isMultiRegion ? groupData?.title || item.name : item.name}
                </h3>
              </div>
            </div>
          );

          if (isMultiRegion && groupData) {
            return (
              <div
                key={item.id}
                onClick={() => setActiveGroup(groupData)}
                role="button"
                tabIndex={0}
              >
                {cardContent}
              </div>
            );
          }

          return (
            <Link key={item.id} href={`/subscriptions/${item.slug}`}>
              {cardContent}
            </Link>
          );
        })}
      </div>

      {/* Region Selection Modal */}
      <RegionModal group={activeGroup} onClose={() => setActiveGroup(null)} />
    </>
  );
}
