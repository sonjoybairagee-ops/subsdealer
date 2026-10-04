"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Graphic Hero Banners — Carousel Peek Layout (Visible Next Slide Bleed)
// ---------------------------------------------------------------------------
const slides = [
  {
    id: "pubg-mobile-uc",
    title: "PUBG Mobile UC Top-Up",
    href: "/subscriptions/pubg-mobile-uc",
    bannerImage: "/banners/hero/hero-pubg.png",
  },
  {
    id: "farlight-84",
    title: "Farlight 84 Diamonds Top-Up",
    href: "/subscriptions/farlight-84-diamonds",
    bannerImage: "/banners/hero/hero-farlight.png",
  },
  {
    id: "gta-5",
    title: "Grand Theft Auto V Game Key",
    href: "/subscriptions/gta-v-game-key",
    bannerImage: "/banners/hero/hero-gta5.png",
  },
  {
    id: "genshin-impact",
    title: "Genshin Impact Genesis Crystals",
    href: "/subscriptions/genshin-impact-genesis-crystals",
    bannerImage: "/banners/hero/hero-genshin.png",
  },
  {
    id: "free-fire",
    title: "Free Fire Diamonds Top-Up",
    href: "/subscriptions/free-fire-bd-server",
    bannerImage: "/banners/hero/hero-freefire.png",
  },
];

const AUTOPLAY_MS = 4000;

export function HeroSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, AUTOPLAY_MS);
  }, []);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, startTimer]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        if (!paused) startTimer();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [paused, startTimer]);

  const goTo = useCallback(
    (index: number) => {
      setActive(index);
      if (!paused) startTimer();
    },
    [paused, startTimer],
  );

  const prev = useCallback(
    () => goTo((active - 1 + slides.length) % slides.length),
    [active, goTo],
  );
  const next = useCallback(
    () => goTo((active + 1) % slides.length),
    [active, goTo],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  };

  return (
    <div
      className="group relative w-full overflow-hidden py-1 outline-none"
      role="region"
      aria-label="Promotional hero slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      {/* Track showing active slide + next slide peeking on the right */}
      <div
        className="flex gap-3 transition-transform duration-600 sm:gap-4"
        style={{
          transform: `translateX(calc(-${active} * (85% + 12px)))`,
          transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)",
        }}
      >
        {slides.map((slide, i) => {
          const isActive = i === active;
          return (
            <div
              key={slide.id}
              className={`w-[85%] sm:w-[88%] lg:w-[89%] shrink-0 overflow-hidden rounded-[20px] border border-white/10 bg-[#101013] shadow-2xl transition-all duration-500 ${
                isActive
                  ? "opacity-100 scale-100 ring-1 ring-white/20"
                  : "opacity-60 scale-[0.98] hover:opacity-90"
              }`}
              style={{ aspectRatio: "1000 / 320" }}
              aria-hidden={!isActive}
            >
              <Link
                href={slide.href}
                className="block relative h-full w-full overflow-hidden rounded-[20px]"
                tabIndex={isActive ? 0 : -1}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.bannerImage}
                  alt={slide.title}
                  className={`h-full w-full object-cover rounded-[20px] transition-transform duration-1000 ease-out ${
                    isActive ? "scale-[1.02]" : "scale-100"
                  }`}
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </Link>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      <button
        type="button"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/70 text-xl text-white opacity-80 backdrop-blur-md transition hover:scale-110 hover:bg-black/90 hover:opacity-100"
        onClick={prev}
        aria-label="Previous slide"
      >
        ‹
      </button>
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/70 text-xl text-white opacity-80 backdrop-blur-md transition hover:scale-110 hover:bg-black/90 hover:opacity-100"
        onClick={next}
        aria-label="Next slide"
      >
        ›
      </button>

      {/* Dot Indicators */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
        role="tablist"
      >
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            className={`h-2 rounded-full transition-all duration-300 ${
              i === active
                ? "w-7 bg-[#e5243b] shadow-md shadow-[#e5243b]/50"
                : "w-2 bg-white/40 hover:bg-white/70"
            }`}
            aria-label={`Slide ${i + 1}: ${slide.title}`}
            aria-current={i === active ? "true" : undefined}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
