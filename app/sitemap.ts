import type { MetadataRoute } from "next";
import { enPaths, nlPaths } from "@/lib/site-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return [...Object.values(nlPaths), ...Object.values(enPaths)].map((path) => ({ url: new URL(path, base).toString(), changeFrequency: "monthly", priority: path === "/" || path === "/en" ? 1 : 0.8 }));
}

