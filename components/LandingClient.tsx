"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Sparkles, Users, Play, Star, Search } from "lucide-react";
import Footer from "@/components/Footer";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const FEATURES = [
  {
    icon: Star,
    title: "Every rating, one place",
    body: "IMDb, Rotten Tomatoes, Metacritic, and TMDB scores together at a glance — no more hopping between five different sites to see what people actually think.",
  },
  {
    icon: Search,
    title: "Search by what it's about",
    body: "Describe a plot in plain English — “a heist crew pulls one last job” — and get real matches, not just keyword hits.",
  },
  {
    icon: Sparkles,
    title: "Recommendations that fit",
    body: "Built from what you've actually watched and rated, not just “more of what's trending this week.”",
  },
  {
    icon: Users,
    title: "A profile for everyone",
    body: "Up to five profiles per account — each with its own watchlist, history, ratings, and recommendations, so the whole household keeps its own taste.",
  },
  {
    icon: Play,
    title: "Where to watch, and how",
    body: "Season and episode browsing, cast pages, watch-provider availability, and a full-featured player with adaptive quality and subtitle support.",
  },
];

export default function LandingClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  // No more "check if this email already has an account, then guess which
  // page to send them to" — sign-in is passwordless by default (a magic
  // link that creates the account automatically the first time), so /signin
  // handles both new and returning visitors identically. This just hands
  // the typed email off so it's pre-filled instead of thrown away.
  const handleGetStarted = () => {
    setError("");
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    router.push(`/signin?email=${encodeURIComponent(email)}`);
  };

  return (
    <div>
      <div className="relative min-h-screen">
        <Image
          src="/images/bg-hero-1.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-ink" />

        <div className="relative z-10 flex min-h-screen flex-col">
          <header className="flex items-center justify-between px-6 py-6 sm:px-16">
            <span className="text-3xl font-black italic tracking-tight text-brand sm:text-4xl">
              BAYFLIX
            </span>
            <Link
              href="/signin"
              className="rounded bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark sm:px-5 sm:py-2 sm:text-base"
            >
              Sign In
            </Link>
          </header>

          <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <h1 className="max-w-3xl animate-fade-in text-4xl font-black leading-tight text-shadow sm:text-6xl">
              Every rating that matters. One search away.
            </h1>
            <p className="mt-4 text-lg text-neutral-200 sm:text-2xl">
              IMDb, Rotten Tomatoes, Metacritic, and TMDB — together, plus AI-powered discovery
              that actually gets your taste.
            </p>
            <p className="mt-2 text-base text-neutral-300 sm:text-lg">
              Enter your email to get started.
            </p>

            <div className="mt-6 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGetStarted()}
                placeholder="Email address"
                type="email"
                className="flex-1 rounded border border-neutral-500 bg-black/60 px-4 py-4 text-base outline-none placeholder-neutral-400 focus:border-white"
              />
              <button
                onClick={handleGetStarted}
                className="flex items-center justify-center gap-2 rounded bg-brand px-6 py-4 text-lg font-semibold text-white transition hover:bg-brand-dark"
              >
                Get Started
                <ChevronRight size={22} strokeWidth={3} />
              </button>
            </div>
            {error && <p className="mt-3 text-sm font-medium text-orange-400">{error}</p>}
          </main>
        </div>
      </div>

      <section className="border-t border-neutral-800 bg-ink px-6 py-20 sm:px-16">
        <div className="mx-auto max-w-6xl">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-brand">
            Why Bayflix
          </p>
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-black sm:text-4xl">
            Stop checking five different sites for one answer
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-neutral-400">
            Every rating that matters, side by side, plus discovery that understands what
            you&rsquo;re actually in the mood for.
          </p>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-neutral-800 bg-ink-card/50 p-6 transition hover:border-neutral-700"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Icon size={20} />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
