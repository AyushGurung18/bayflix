"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Footer from "@/components/Footer";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function Home() {
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
      const methods = await fetchSignInMethodsForEmail(auth, email);
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
      <Footer />
    </div>
  );
}
