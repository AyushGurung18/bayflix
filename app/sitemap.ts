import type { MetadataRoute } from "next";

const SITE_URL = "https://bayflix.ayushgurung.com";

// Everything past sign-in is behind RequireAuth and just redirects an
// anonymous crawler straight back to /signin — no point listing it.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/signin", priority: 0.6 },
    { path: "/signup", priority: 0.6 },
  ];

  return routes.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority,
  }));
}
