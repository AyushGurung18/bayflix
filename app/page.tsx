import type { Metadata } from "next";
import LandingClient from "@/components/LandingClient";

const SITE_URL = "https://bayflix.ayushgurung.com";
const TITLE = "Bayflix — AI-Powered Streaming Browser | Next.js & Cloudflare Portfolio Project";
const DESCRIPTION =
  "Bayflix is a full-stack Netflix-style streaming browser built by Ayush Gurung: real Firebase authentication, a custom HLS video player, and an AI-powered semantic search and recommendation engine on Cloudflare Workers, D1, Vectorize, and Workers AI.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "Bayflix",
    "Ayush Gurung",
    "Next.js portfolio project",
    "Netflix clone",
    "Cloudflare Workers project",
    "AI recommendation engine",
    "semantic search movies",
    "full stack developer portfolio",
    "TMDB API app",
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
