// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://webgiverse.com";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/admin"] },
    sitemap: `${base}/sitemap.xml`,
  };
}