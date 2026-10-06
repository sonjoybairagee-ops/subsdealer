"use client";

import Link from "next/link";
import { useEffect } from "react";

export interface RegionOption {
  slug: string;
  name: string;
  regionLabel: string;
  flag?: string;
  thumbnail_url?: string | null;
  cheapestPrice: number;
}

export interface RegionModalGroup {
  title: string; // e.g. "VALORANT"
  options: RegionOption[];
}

export function RegionModal({
  group,
  onClose,
}: {
  group: RegionModalGroup | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (group) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [group, onClose]);

  if (!group) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Dark backdrop blur */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card (RMT Game Shop style) */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/10 bg-[#0d111a] p-6 shadow-2xl shadow-black/80 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5243b]/10 text-xl font-black text-[#e5243b]">
              🌐
            </span>
            <div>
              <h3 className="text-xl font-black uppercase tracking-wider text-white sm:text-2xl">
                {group.title}
              </h3>
              <p className="text-xs font-semibold text-white/60 sm:text-sm">
                Select your package option
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Region Options Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5">
          {group.options.map((opt) => (
            <Link
              key={opt.slug}
              href={`/subscriptions/${opt.slug}`}
              onClick={onClose}
              className="group relative flex flex-col overflow-hidden rounded-[18px] border border-white/10 bg-[#141924] transition-all duration-200 hover:-translate-y-1.5 hover:border-[#e5243b]/60 hover:shadow-xl hover:shadow-[#e5243b]/15"
            >
              {/* Cover Image */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#181d2a]">
                {opt.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={opt.thumbnail_url}
                    alt={opt.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-black text-white/30 text-3xl">
                    {opt.regionLabel.slice(0, 2).toUpperCase()}
                  </div>
                )}

                {/* Flag / Region Badge */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-extrabold text-white backdrop-blur-md border border-white/10">
                  {opt.flag && <span>{opt.flag}</span>}
                  <span>{opt.regionLabel}</span>
                </div>

                {/* Orange Instant Badge */}
                <span className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#f97316] text-white shadow-md">
                  ⚡
                </span>
              </div>

              {/* Title & Price Footer */}
              <div className="bg-white px-2 py-3 text-center">
                <h4 className="line-clamp-1 text-xs font-bold text-slate-900 sm:text-sm">
                  {opt.name}
                </h4>
                <p className="mt-0.5 text-[11px] font-extrabold text-[#e5243b]">
                  From ৳{opt.cheapestPrice.toLocaleString()}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer Brand watermark */}
        <div className="mt-6 text-center text-xs font-bold tracking-widest uppercase text-white/20">
          Subsdealer • Fast &amp; Reliable Digital Store
        </div>
      </div>
    </div>
  );
}
