"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Sparkles, Users, Play, Star, Search } from "lucide-react";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Footer from "@/components/Footer";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const FEATURES = [
  {
    icon: Search,
    title: "AI semantic search",
    body: "Describe a plot in plain English — “a heist crew pulls one last job” — and get real matches, not keyword hits. Powered by Cloudflare Workers AI embeddings and a Vectorize vector index.",
  },
  {
    icon: Sparkles,
    title: "Personalized recommendations",
    body: "A taste vector built from what you've watched and rated, weighted by your star ratings — not just “more of what's trending.”",
  },
  {
    icon: Users,
    title: "Multi-profile support",
    body: "Up to five profiles per account, Netflix-style — each with its own watchlist, watched history, ratings, and independently personalized recommendations.",
  },
  {
    icon: Star,
    title: "Real ratings, cached responsibly",
    body: "IMDb, Rotten Tomatoes, Metacritic, and TMDB scores, cached in a real database with a 30-day TTL so free-tier API quotas survive real traffic.",
  },
  {
    icon: Play,
    title: "Custom HLS video player",
    body: "Adaptive quality, audio/subtitle track switching, scrubbing with live preview — built from scratch with hls.js against a Cloudflare Worker + R2 bucket.",
  },
];

const STACK = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Tailwind CSS v4",
  "Cloudflare Workers",
  "D1",
  "Vectorize",
  "Workers AI",
  "Firebase Auth",
  "hls.js",
];

export default function LandingClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const handleGetStarted = async () => {
    setError("");
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setChecking(true);
    try {
      const methods = await fetchSignInMethodsForEmail(auth!, email);
      if (methods.length > 0) {
        router.push("/signin");
      } else {
        router.push(`/signup?email=${encodeURIComponent(email)}`);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setChecking(false);
    }
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
              Unlimited movies, TV shows, and more.
            </h1>
            <p className="mt-4 text-lg text-neutral-200 sm:text-2xl">
              Watch anywhere. Cancel anytime.
            </p>
            <p className="mt-2 text-base text-neutral-300 sm:text-lg">
              Ready to watch? Enter your email to create your account.
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
                disabled={checking}
                className="flex items-center justify-center gap-2 rounded bg-brand px-6 py-4 text-lg font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
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
            Under the hood
          </p>
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-black sm:text-4xl">
            A real streaming platform&rsquo;s engineering, built as a portfolio project
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-neutral-400">
            Bayflix is an independent full-stack project by{" "}
            <a
              href="https://ayushgurung.com"
              target="_blank"
              rel="noreferrer"
              className="text-neutral-300 underline decoration-neutral-600 underline-offset-2 hover:text-white"
            >
              Ayush Gurung
            </a>{" "}
            demonstrating real authentication, a custom video player, and an AI-powered
            recommendation engine &mdash; running entirely on free-tier infrastructure.
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

          <div className="mt-16 text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">
              Built with
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {STACK.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
