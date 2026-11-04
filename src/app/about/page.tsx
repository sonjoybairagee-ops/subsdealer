import { Metadata } from "next";
import { ShieldCheck, Zap, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | subsdealer.com",
  description: "Learn about subsdealer.com and our mission to provide lightning-fast, 100% private client-side file tools.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          About subsdealer.com
        </h1>
        <p className="mt-3 text-base text-slate-600 max-w-xl mx-auto">
          Free, fast, and completely secure file utilities built directly for your browser.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6 text-sm text-slate-700 leading-relaxed">
        <h2 className="text-xl font-bold text-slate-900">Our Mission</h2>
        <p>
          At <strong>subsdealer.com</strong>, we believe file conversion, image compression, and basic editing tasks shouldn&apos;t require bulky desktop software installations or compromise your privacy by sending your personal documents and photos to untrusted third-party cloud servers.
        </p>

        <h2 className="text-xl font-bold text-slate-900">100% Client-Side Architecture</h2>
        <p>
          By harnessing modern web technologies—specifically the HTML5 Canvas API, Web Workers, and WebAssembly—our tools perform all calculations directly inside your own web browser. Your confidential images and documents never leave your computer or phone.
        </p>

        <h2 className="text-xl font-bold text-slate-900">Free Forever & Ad-Supported</h2>
        <p>
          We are committed to maintaining all core tools completely free without registration gates, watermarks, or artificial limits. Minimal, non-intrusive advertisements help us maintain and continually expand our open tool suite.
        </p>
      </div>
    </div>
  );
}
