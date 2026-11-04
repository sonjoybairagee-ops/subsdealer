import { Metadata } from "next";
import ToolsExplorer from "@/components/tools/ToolsExplorer";
import { TOOLS_DATA, CATEGORIES } from "@/lib/tools-data";
import { Sparkles, Wrench } from "lucide-react";

export const metadata: Metadata = {
  title: "108+ Free Online Multimedia, Creator & Developer Tools — Subsdealer",
  description:
    "Explore 108 fast, private browser-based tools: video downloaders, AI auto captions, PDF editors, image converters, audio normalizers, and developer utilities.",
  alternates: {
    canonical: "/tools",
  },
  keywords: [
    "free online tools",
    "creator tools directory",
    "video downloaders",
    "ai caption generator",
    "image tools online",
    "pdf tools online",
    "free audio tools",
    "developer utilities",
    "Subsdealer tools",
  ],
};

export default function ToolsHubPage() {
  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Hero Header */}
      <section className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white py-16 px-4 text-center">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>108 Free Online Browser Tools</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">
            All Free Online Tools & Utilities
          </h1>
          <p className="text-blue-100 text-base sm:text-lg max-w-2xl mx-auto">
            100% client-side privacy, lightning fast, and zero registration required. Browse our full suite of media, video, audio, PDF, image, and developer tools.
          </p>
        </div>
      </section>

      {/* Main Tools Catalog Section */}
      <main className="relative mx-auto max-w-7xl px-4 pt-10 pb-20 sm:px-6 lg:px-8 w-full">
        <ToolsExplorer tools={TOOLS_DATA} categories={CATEGORIES} />
      </main>
    </div>
  );
}

