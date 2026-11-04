import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Sparkles, Clock, Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "How to Compress Images Without Losing Quality | subsdealer.com",
  description:
    "Learn the exact methods to compress photos and graphics without visible loss of clarity. Save bandwidth, improve Google PageSpeed, and optimize for web.",
};

export default function CompressGuidePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Articles</span>
      </Link>

      <header className="mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
          Optimization Tutorial
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
          How to Compress Images Without Losing Quality
        </h1>
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>October 2026</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>4 min read</span>
          </span>
        </div>
      </header>

      <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700 space-y-6">
        <p>
          High-resolution photographs can easily exceed 5 MB to 15 MB in file size. When uploaded directly to websites, they trigger sluggish load times, lower conversion rates, and hurt Google Core Web Vitals rankings (specifically Largest Contentful Paint - LCP).
        </p>

        <h2 className="text-xl font-bold text-slate-900 pt-2">
          1. Lossy vs. Lossless Compression Explained
        </h2>
        <p>
          <strong>Lossless compression</strong> reduces file size by eliminating redundant metadata (EXIF camera details, GPS tags, color profiles) without changing a single pixel. Savings typically range between 5% and 20%.
        </p>
        <p>
          <strong>Lossy compression</strong> selectively discards high-frequency color variations that the human eye cannot discern. With quality set between 75% and 85%, images look virtually indistinguishable from originals while shedding 70% to 90% of their bytes!
        </p>

        <h2 className="text-xl font-bold text-slate-900 pt-2">
          2. The WebP Advantage
        </h2>
        <p>
          Converting legacy JPG or PNG images to Google&apos;s WebP container format is one of the highest leverage optimizations. WebP provides:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs">
          <li>25% to 34% smaller file sizes than comparable JPEG images.</li>
          <li>Alpha transparency support while maintaining smaller footprints than PNG.</li>
          <li>Universal support across all modern desktop and mobile browsers.</li>
        </ul>

        {/* Call to action box */}
        <div className="my-8 rounded-2xl bg-blue-50 border border-blue-200/60 p-6">
          <h3 className="text-base font-bold text-blue-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <span>Try It Right Now For Free</span>
          </h3>
          <p className="mt-1.5 text-xs text-blue-700">
            Use our free, private client-side compressor to optimize your pictures in seconds without uploading anything to a server.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/image-tools/image-compressor"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
            >
              Open Image Compressor
            </Link>
            <Link
              href="/image-tools/jpg-to-webp"
              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50"
            >
              Convert to WebP
            </Link>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 pt-2">
          3. Sizing Images to Target Display Dimensions
        </h2>
        <p>
          Never serve a 4000×3000 pixel camera photo in a card that displays at 400×300 pixels. Use an image resizer to scale down the master dimensions first, then apply 75-80% quality compression for maximal speed and bandwidth savings.
        </p>
      </div>
    </article>
  );
}
