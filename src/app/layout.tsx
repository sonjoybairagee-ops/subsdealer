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
  metadataBase: new URL("https://iformat.io"),
  title: {
    default: "iformat.io - Free Online File Converter & Image Compressor",
    template: "%s | iformat.io",
  },
  description:
    "Convert & compress images and files effortlessly. 100% client-side privacy, free image compressor, JPG to WebP, PNG to JPG, image resizer, and cropper.",
  keywords: [
    "image compressor",
    "jpg to webp",
    "png to jpg",
    "image resizer",
    "image cropper",
    "online converter",
    "free file compressor",
    "client-side privacy",
  ],
  authors: [{ name: "iformat.io" }],
  creator: "iformat.io",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://iformat.io",
    title: "iformat.io - Convert & Compress Files Effortlessly",
    description: "Fast, secure, and easy-to-use online tools for all your file needs.",
    siteName: "iformat.io",
  },
  twitter: {
    card: "summary_large_image",
    title: "iformat.io - Convert & Compress Files Effortlessly",
    description: "Fast, secure, and easy-to-use online tools for all your file needs.",
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
