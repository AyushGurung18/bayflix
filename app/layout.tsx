import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ProfileProvider } from "@/lib/profile-context";
import { WatchStatusProvider } from "@/lib/watch-status-context";
import SmoothScroll from "@/components/SmoothScroll";
import AmbientEffects from "@/components/AmbientEffects";
import type { Metadata } from "next";
import type { ReactNode } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = "https://bayflix.ayushgurung.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Bayflix — AI-Powered Streaming Browser",
    template: "%s | Bayflix",
  },
  description:
    "Bayflix is a TMDB-powered streaming browser with AI semantic search and recommendations, built with Next.js and Cloudflare Workers. Watch anywhere, cancel anytime.",
  manifest: "/manifest.json",
  robots: { index: true, follow: true },
  openGraph: {
    siteName: "Bayflix",
    type: "website",
    images: [{ url: "/images/bg-hero-1.jpg", width: 1200, height: 630, alt: "Bayflix" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/bg-hero-1.jpg"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-ink text-neutral-100">
        <svg width="0" height="0" className="absolute" aria-hidden>
          <defs>
            <linearGradient id="bayflix-star-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFE9A8" />
              <stop offset="45%" stopColor="#F5C518" />
              <stop offset="100%" stopColor="#C9860A" />
            </linearGradient>
          </defs>
        </svg>
        <AmbientEffects />
        <SmoothScroll />
        <AuthProvider>
          <ProfileProvider>
            <WatchStatusProvider>{children}</WatchStatusProvider>
          </ProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
