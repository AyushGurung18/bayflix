import type { MetadataRoute } from "next";

const SITE_URL = "https://bayflix.ayushgurung.com";

// Auth-gated routes just redirect an anonymous crawler to /signin — disallow
// them so crawl budget goes to the pages that actually have content to index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/browse",
        "/watch/",
        "/movie/",
        "/tv/",
        "/person/",
        "/category/",
        "/search",
        "/watchlist",
        "/profile",
        "/profiles",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
