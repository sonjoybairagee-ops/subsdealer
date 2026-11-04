"use client";

import { useState } from "react";
import Link from "next/link";
import ToolCard from "@/components/ToolCard";
import { TOOLS_DATA, CATEGORIES } from "@/lib/tools-data";
import { Sparkles, ShieldCheck, Zap, Lock, ArrowRight, HelpCircle } from "lucide-react";

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredTools =
    activeCategory === "all"
      ? TOOLS_DATA
      : TOOLS_DATA.filter((tool) => tool.category === activeCategory);

  return (
    <div className="flex flex-col">
      {/* Hero Section matching subsdealer.com reference */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#2563eb] via-[#5b45f4] to-[#9333ea] py-20 sm:py-28 text-white text-center shadow-inner">
        {/* Subtle decorative glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-md mb-6 border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>100% Client-Side & Private • Zero Server Upload</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Convert & Compress Files Effortlessly
          </h1>

          <p className="mt-5 text-base sm:text-xl text-blue-100 max-w-2xl mx-auto font-normal leading-relaxed">
            Fast, secure, and easy-to-use online tools for all your file needs.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#tools"
              className="rounded-full bg-white px-8 py-3 text-sm font-bold text-blue-600 shadow-lg shadow-black/15 transition-all hover:scale-105 hover:bg-slate-50 hover:shadow-xl focus:outline-hidden"
            >
              Get Started
            </a>
            <Link
              href="/image-tools/image-compressor"
              className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20"
            >
              Try Image Compressor
            </Link>
          </div>
        </div>
      </section>

      {/* Main Tools Section */}
      <section id="tools" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 w-full scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Our Popular Tools
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            Transform your files with our suite of converters and compressors. Whether it&apos;s
            documents, images, audio, or video, we have the tool you need.
          </p>

          {/* Category Tabs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                  activeCategory === cat.id
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100/60"
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid matching reference screenshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Why Users Choose subsdealer.com
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Designed from the ground up for speed, privacy, and simplicity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 mb-4">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Complete Data Privacy</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                All image processing, compression, and conversions happen directly in your browser using the HTML5 Canvas API. Your photos never leave your device.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 mb-4">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Zero Server Wait Time</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Traditional cloud converters make you wait in queues to upload and download. With client-side rendering, you get immediate results in milliseconds.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 mb-4">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">High Quality Outputs</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Smart compression algorithms maintain visual fidelity while slashing file weights up to 90%, perfect for web optimization and Google Core Web Vitals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEO & FAQ Section */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center justify-center gap-2">
            <HelpCircle className="h-6 w-6 text-blue-600" />
            <span>Frequently Asked Questions</span>
          </h2>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-800">
              Is subsdealer.com really free to use?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Yes, 100% free with no file limits, no registration required, and no hidden subscriptions.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-800">
              Are my files uploaded to your servers?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              No. All operations run directly inside your web browser. Neither our server nor any third party ever receives, stores, or accesses your images.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-800">
              Which format is best: WebP or JPG?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              WebP offers 25-35% superior compression compared to standard JPG at the same perceived image quality. It is widely supported across all modern browsers and recommended by Google for SEO.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
