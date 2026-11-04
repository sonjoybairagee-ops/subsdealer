"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, ChevronDown, Sparkles, X } from "lucide-react";
import { TOOLS_DATA } from "@/lib/tools-data";

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTools = searchQuery.trim()
    ? TOOLS_DATA.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo matching reference iformat.io */}
          <div className="flex items-center gap-8">
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-sm shadow-orange-500/20 transition-transform group-hover:scale-105">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                iformat<span className="text-orange-500">.io</span>
              </span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden xl:flex items-center gap-3.5 text-sm font-medium text-slate-600">
              <Link href="/tools" className="font-semibold text-blue-600 transition-colors hover:text-blue-700">
                All Tools
              </Link>
              <Link href="/image-tools" className="transition-colors hover:text-slate-900">
                Image
              </Link>
              <Link href="/video-tools" className="transition-colors hover:text-slate-900">
                Video
              </Link>
              <Link href="/downloader-tools" className="transition-colors hover:text-slate-900">
                Downloader
              </Link>
              <Link href="/pdf-tools" className="transition-colors hover:text-slate-900">
                PDF
              </Link>
              <Link href="/text-tools" className="transition-colors hover:text-slate-900">
                Text
              </Link>
              <Link href="/subtitle-tools" className="transition-colors hover:text-slate-900">
                Subtitle
              </Link>
              <Link href="/developer-tools" className="transition-colors hover:text-slate-900">
                Dev
              </Link>
              <Link href="/audio-tools" className="transition-colors hover:text-slate-900">
                Audio
              </Link>
              <Link href="/file-tools" className="transition-colors hover:text-slate-900">
                File
              </Link>
              <Link href="/calculator-tools" className="transition-colors hover:text-slate-900">
                Calculators
              </Link>
              <Link href="/design-tools" className="transition-colors hover:text-slate-900">
                Design
              </Link>
              <Link href="/seo-tools" className="transition-colors hover:text-slate-900">
                SEO
              </Link>
              <Link href="/marketing-tools" className="transition-colors hover:text-slate-900">
                Marketing
              </Link>
              <Link href="/blog" className="transition-colors hover:text-slate-900">
                Blog
              </Link>
            </nav>
          </div>

          {/* Right section: Search bar & EN dropdown */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs sm:text-sm text-slate-500 hover:border-slate-300 hover:bg-slate-100/70 transition-all sm:w-60 justify-between"
              >
                <span className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-slate-400" />
                  <span className="hidden sm:inline">Search tools...</span>
                  <span className="sm:hidden">Search</span>
                </span>
                <kbd className="hidden sm:inline-block rounded border border-slate-200 bg-white px-1.5 text-[10px] font-semibold text-slate-400">
                  Ctrl+K
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-1 text-sm font-medium text-slate-700 px-2 py-1 rounded-md hover:bg-slate-100 cursor-pointer">
              <span>EN</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-20 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-900/10">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search tools (e.g., compress, webp, resize)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-slate-100">
              {searchQuery.trim() === "" ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Type any keyword to instantly locate tools.
                </div>
              ) : filteredTools.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">
                  No tools found for &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredTools.map((tool) => (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {tool.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {tool.shortDesc}
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-blue-600 capitalize">
                      {tool.category}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
