"use client";

import Link from "next/link";
import { Shield, Zap, Lock, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 text-slate-600">
      {/* Privacy & Trust Banner */}
      <div className="border-b border-slate-200/60 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">100% Client-Side Privacy</h4>
                <p className="text-xs text-slate-500">Files are processed in your browser. Nothing is uploaded to any server.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Lightning Fast Speed</h4>
                <p className="text-xs text-slate-500">Zero waiting in queue. Instant conversion using HTML5 Canvas & WebAssembly.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Completely Free Forever</h4>
                <p className="text-xs text-slate-500">No account required, no file limits, and no watermark.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer links */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-xs">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <span className="text-lg font-bold text-slate-900">
                Subsdealer<span className="text-orange-500">.com</span>
              </span>
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-slate-500 max-w-sm">
              Your all-in-one free browser tool suite for compressing, converting, and editing images, documents, and media safely and effortlessly.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold tracking-wider text-slate-900 uppercase">Image Tools</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/image-tools/image-compressor" className="hover:text-slate-900 transition-colors">
                  Image Compressor
                </Link>
              </li>
              <li>
                <Link href="/image-tools/jpg-to-webp" className="hover:text-slate-900 transition-colors">
                  JPG to WebP Converter
                </Link>
              </li>
              <li>
                <Link href="/image-tools/png-to-jpg" className="hover:text-slate-900 transition-colors">
                  PNG to JPG Converter
                </Link>
              </li>
              <li>
                <Link href="/image-tools/image-resizer" className="hover:text-slate-900 transition-colors">
                  Image Resizer
                </Link>
              </li>
              <li>
                <Link href="/image-tools/image-cropper" className="hover:text-slate-900 transition-colors">
                  Image Cropper
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold tracking-wider text-slate-900 uppercase">Categories</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/tools" className="font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  All 108 Free Tools
                </Link>
              </li>
              <li>
                <Link href="/video-tools" className="hover:text-slate-900 transition-colors">
                  Video Utilities
                </Link>
              </li>
              <li>
                <Link href="/downloader-tools" className="hover:text-slate-900 transition-colors">
                  Downloader Utilities
                </Link>
              </li>
              <li>
                <Link href="/image-tools" className="hover:text-slate-900 transition-colors">
                  Image Utilities
                </Link>
              </li>
              <li>
                <Link href="/pdf-tools" className="hover:text-slate-900 transition-colors">
                  PDF Utilities
                </Link>
              </li>
              <li>
                <Link href="/text-tools" className="hover:text-slate-900 transition-colors">
                  Text Utilities
                </Link>
              </li>
              <li>
                <Link href="/subtitle-tools" className="hover:text-slate-900 transition-colors">
                  Subtitle Utilities
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-slate-900 transition-colors">
                  Guides & Tutorials
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold tracking-wider text-slate-900 uppercase">Trust & Legal</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/about" className="hover:text-slate-900 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-slate-900 transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-slate-900 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-slate-900 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200/60 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 subsdealer.com. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built for maximum privacy and performance with Next.js
          </p>
        </div>
      </div>
    </footer>
  );
}
