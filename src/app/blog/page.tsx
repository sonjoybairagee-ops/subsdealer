import { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowRight, Calendar, User } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog & Tutorials - File Compression & Web Optimization Guides",
  description: "Learn how to optimize images, speed up web performance, and convert files efficiently.",
};

const POSTS = [
  {
    slug: "how-to-compress-images-without-losing-quality",
    title: "How to Compress Images Without Losing Quality: Complete Guide",
    excerpt: "Discover the best techniques to slash image file sizes up to 80% while retaining razor-sharp visual fidelity for web and mobile.",
    date: "October 2026",
    readTime: "4 min read",
    category: "Image Optimization",
  },
];

export default function BlogIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200/60">
          Knowledge Base & Tutorials
        </span>
        <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Articles & SEO Guides
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Actionable tutorials on image optimization, file formats, and Core Web Vitals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {POSTS.map((post) => (
          <article
            key={post.slug}
            className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                {post.category}
              </span>
              <h2 className="mt-2 text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {post.excerpt}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{post.date}</span>
              </span>
              <Link
                href={`/blog/${post.slug}`}
                className="flex items-center gap-1 font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform"
              >
                <span>Read Article</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
