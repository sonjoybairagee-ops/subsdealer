"use client";

import { useState, useMemo } from "react";
import ToolCard from "@/components/ToolCard";
import { ToolItem } from "@/lib/tools-data";
import { Search, X, Sparkles, SlidersHorizontal } from "lucide-react";

interface CategoryItem {
  id: string;
  label: string;
  count: number;
}

interface ToolsExplorerProps {
  tools: ToolItem[];
  categories: CategoryItem[];
}

export default function ToolsExplorer({ tools, categories }: ToolsExplorerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredTools = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tools.filter((tool) => {
      const matchesCategory =
        selectedCategory === "all" || tool.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!q) return true;

      return (
        tool.name.toLowerCase().includes(q) ||
        tool.shortDesc.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q) ||
        (tool.badge && tool.badge.toLowerCase().includes(q))
      );
    });
  }, [tools, selectedCategory, searchQuery]);

  return (
    <div className="w-full">
      {/* Search Bar */}
      <div className="mb-8 flex flex-col items-center justify-center space-y-3">
        <div className="relative w-full max-w-2xl">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-blue-500">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 108 free tools (e.g. video downloader, background remover, PDF, SRT, Diff)..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 sm:py-4 pl-12 pr-12 text-sm sm:text-base text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
          <span>
            Showing{" "}
            <strong className="text-blue-600 font-semibold">
              {filteredTools.length}
            </strong>{" "}
            of {tools.length} Tools
          </span>
        </div>
      </div>

      {/* Category Pills Navigation */}
      <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          const count = cat.id === "all" ? tools.length : tools.filter((t) => t.category === cat.id).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "border border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`ml-1.5 text-[11px] font-mono ${
                  isActive ? "text-blue-100" : "text-slate-400"
                }`}
              >
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Tools Grid */}
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      ) : (
        <div className="my-12 rounded-2xl border border-slate-200 bg-white p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-4">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No tools found</h3>
          <p className="mt-2 text-xs text-slate-500">
            No utilities found matching &ldquo;{searchQuery}&rdquo; in this category.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="mt-5 rounded-lg border border-blue-600 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
