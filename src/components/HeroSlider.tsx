"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Slide data — add / remove / reorder here, no JSX changes needed.
// ---------------------------------------------------------------------------
const slides = [
  {
    id: "canva-pro",
    category: "Design",
    title: "Canva Pro",
    tagline: "Create without limits.",
    cta: "Get Canva Pro →",
    href: "/subscriptions/canva-pro",
    image: "/products/canva-pro.png",
    className: "slide--canva",
  },
  {
    id: "chatgpt-plus",
    category: "AI Tools",
    title: "ChatGPT Plus",
    tagline: "Unlock smarter productivity.",
    cta: "Get ChatGPT Plus →",
    href: "/subscriptions/chatgpt-plus",
    image: "/products/chatgpt-plus.png",
    className: "slide--chatgpt",
  },
  {
    id: "capcut-pro",
    category: "Video",
    title: "CapCut Pro",
    tagline: "Edit. Create. Go Pro.",
    cta: "Get CapCut Pro →",
    href: "/subscriptions/capcut-pro",
    image: "/products/capcut-pro.png",
    className: "slide--capcut",
  },
  {
    id: "pubg-mobile-uc",
    category: "Game Top-Up",
    title: "PUBG Mobile UC",
    tagline: "Top up your UC instantly.",
    cta: "Top Up Now →",
    href: "/subscriptions/pubg-mobile-uc",
    image: "/products/pubg-mobile-uc.png",
    className: "slide--pubg",
  },
  {
    id: "game-topup",
    category: "Game Top-Up",
    title: "Game Top-Up",
    tagline: "Your favourite games, one place.",
    cta: "Browse Games →",
    href: "/subscriptions?category=games",
    image: "/products/mobile-legends.png",
    className: "slide--games",
  },
];

const AUTOPLAY_MS = 4000;

export function HeroSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  // Use a ref to debounce interval resets without re-creating the effect.
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, AUTOPLAY_MS);
  }, []);

  // Autoplay — pauses when hovering or tab is hidden.
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

  // Also pause when the document tab is hidden.
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

  // Manual navigation — always resets the timer to avoid a near-instant jump.
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

  // Keyboard arrow navigation when the slider is focused.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  };

  return (
    <div
      className="hero-slider"
      role="region"
      aria-label="Promotional banner"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={onKeyDown}
    >
      {/* Track */}
      <div
        className="slider-track"
        style={{ transform: `translateX(-${active * 100}%)` }}
        aria-live="polite"
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`slide ${slide.className}`}
            aria-hidden={i !== active}
          >
            {/* Left: text content */}
            <div className="slide-content">
              <span className="slide-category">{slide.category}</span>
              <h2 className="slide-title">{slide.title}</h2>
              <p className="slide-tagline">{slide.tagline}</p>
              <Link
                href={slide.href}
                className="slide-cta"
                tabIndex={i !== active ? -1 : 0}
              >
                {slide.cta}
              </Link>
            </div>

            {/* Right: product image */}
            <div className="slide-image-wrap" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.image}
                alt=""
                className="slide-image"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Arrows */}
      <button
        className="slider-arrow slider-arrow--prev"
        onClick={prev}
        aria-label="Previous slide"
      >
        ‹
      </button>
      <button
        className="slider-arrow slider-arrow--next"
        onClick={next}
        aria-label="Next slide"
      >
        ›
      </button>

      {/* Dot navigation */}
      <div className="slider-dots" role="tablist" aria-label="Slide indicators">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            role="tab"
            className={`slider-dot${i === active ? " slider-dot--active" : ""}`}
            aria-label={`Go to slide ${i + 1}: ${slide.title}`}
            aria-current={i === active ? "true" : undefined}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
