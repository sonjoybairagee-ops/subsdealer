import { MetadataRoute } from "next";
import { TOOLS_DATA } from "@/lib/tools-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.subsdealer.com";

  // Category pages
  const categories = [
    "/tools",
    "/image-tools",
    "/video-tools",
    "/downloader-tools",
    "/audio-tools",
    "/pdf-tools",
    "/design-tools",
    "/developer-tools",
    "/calculator-tools",
    "/text-tools",
    "/subtitle-tools",
    "/file-tools",
    "/seo-tools",
    "/marketing-tools",
  ];

  // Static info & legal pages
  const staticPages = [
    "",
    "/about",
    "/contact",
    "/privacy-policy",
    "/terms",
    "/blog",
    "/blog/how-to-compress-images-without-losing-quality",
  ];

  const staticEntries: MetadataRoute.Sitemap = [
    ...staticPages.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: route === "" ? ("daily" as const) : ("weekly" as const),
      priority: route === "" ? 1.0 : 0.8,
    })),
    ...categories.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];

  const toolEntries: MetadataRoute.Sitemap = TOOLS_DATA.map((tool) => ({
    url: `${baseUrl}${tool.href}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticEntries, ...toolEntries];
}
