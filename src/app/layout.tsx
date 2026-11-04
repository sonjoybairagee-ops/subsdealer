import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.subsdealer.com"),
  title: {
    default: "Subsdealer — 108+ Free Online File Converters, Video & Creator Tools",
    template: "%s | Subsdealer",
  },
  description:
    "108+ fast, free browser-based tools: video downloaders, AI auto captions, PDF editors, image converters, audio normalizers, and developer utilities with 100% client-side privacy.",
  keywords: [
    "subsdealer",
    "free online tools",
    "video downloaders",
    "ai caption generator",
    "image compressor",
    "jpg to webp",
    "png to jpg",
    "pdf tools",
    "audio converter",
    "online converter",
    "client-side privacy",
  ],
  authors: [{ name: "Subsdealer" }],
  creator: "Subsdealer",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.subsdealer.com",
    title: "Subsdealer — 108+ Free Online File Converters & Creator Tools",
    description: "Fast, secure, and easy-to-use online tools for all your file and media needs.",
    siteName: "Subsdealer",
  },
  twitter: {
    card: "summary_large_image",
    title: "Subsdealer — 108+ Free Online File Converters & Creator Tools",
    description: "Fast, secure, and easy-to-use online tools for all your file and media needs.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
