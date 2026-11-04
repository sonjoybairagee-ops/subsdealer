import { TOOLS_DATA } from "@/lib/tools-data";
import ToolCard from "@/components/ToolCard";
import Link from "next/link";
import { Download, ChevronRight } from "lucide-react";

export const metadata = {
  title: "Free Online Media & Video Downloaders — subsdealer.com",
  description:
    "Download high quality MP4 videos, MP3 audio, and HD thumbnails from YouTube, Facebook, Instagram, and Pinterest. 100% free and private.",
};

export default function DownloaderToolsPage() {
  const tools = TOOLS_DATA.filter((t) => t.category === "downloader");

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
            <Download className="w-4 h-4" />
            Downloader Tools
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight">
            Free Media Downloaders & Extractors
          </h1>
          <p className="text-teal-100 text-lg max-w-2xl mx-auto">
            Save videos, grab YouTube thumbnails, and extract audio tracks quickly and securely with zero watermarks.
          </p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <nav className="flex items-center gap-1 text-sm text-slate-500">
          <Link href="/" className="hover:text-emerald-600 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-800 font-medium">Downloader Tools</span>
        </nav>
      </div>

      {/* Tools Grid */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>
    </main>
  );
}

