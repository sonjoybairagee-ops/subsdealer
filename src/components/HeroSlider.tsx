"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Graphic Hero Banners — Auto-playing interactive slider
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
      className="group relative w-full overflow-hidden rounded-[20px] border border-white/10 bg-[#101013] shadow-2xl outline-none"
      role="region"
      aria-label="Promotional hero slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      {/* Slider Track */}
      <div
        className="flex w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className="w-full min-w-full shrink-0 overflow-hidden"
            aria-hidden={i !== active}
          >
            <Link
              href={slide.href}
              className="block w-full overflow-hidden rounded-[20px]"
              tabIndex={i !== active ? -1 : 0}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.bannerImage}
                alt={slide.title}
                className="w-full h-auto block rounded-[20px] object-contain transition-transform duration-300 group-hover:scale-[1.008]"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </Link>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        type="button"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-xl text-white opacity-80 backdrop-blur-md transition hover:scale-110 hover:bg-black/90 hover:opacity-100"
        onClick={prev}
        aria-label="Previous slide"
      >
        ‹
      </button>
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-xl text-white opacity-80 backdrop-blur-md transition hover:scale-110 hover:bg-black/90 hover:opacity-100"
        onClick={next}
        aria-label="Next slide"
      >
        ›
      </button>

      {/* Dot Indicators */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2"
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
