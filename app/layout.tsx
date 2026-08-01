import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ProfileProvider } from "@/lib/profile-context";
import { WatchStatusProvider } from "@/lib/watch-status-context";
import SmoothScroll from "@/components/SmoothScroll";
import type { Metadata } from "next";
import type { ReactNode } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bayflix — Unlimited movies, TV shows and more",
  description:
    "Bayflix is a TMDB-powered streaming browser. Watch anywhere, cancel anytime.",
  manifest: "/manifest.json",
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
        <div className="cinematic-vignette" />
        <div className="grain-overlay" />
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
