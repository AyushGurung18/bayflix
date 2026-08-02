import type { Metadata } from "next";
import LandingClient from "@/components/LandingClient";

const SITE_URL = "https://bayflix.ayushgurung.com";
const TITLE = "Bayflix — IMDb, Rotten Tomatoes & Metacritic Ratings in One Place";
const DESCRIPTION =
  "Bayflix brings IMDb, Rotten Tomatoes, Metacritic, and TMDB ratings together in one place, with AI-powered semantic search and recommendations built around what you actually watch.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "Bayflix",
    "movie ratings aggregator",
    "IMDb Rotten Tomatoes Metacritic ratings",
    "AI movie recommendations",
    "semantic movie search",
    "TV show ratings",
    "where to watch movies",
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Bayflix",
    type: "website",
    images: [{ url: "/images/bg-hero-1.jpg", width: 1200, height: 630, alt: "Bayflix" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/images/bg-hero-1.jpg"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Bayflix",
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  author: {
    "@type": "Person",
    name: "Ayush Gurung",
    url: "https://ayushgurung.com",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingClient />
    </>
  );
}
