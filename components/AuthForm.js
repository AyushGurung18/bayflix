"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const GoogleIcon = (props) => (
  <svg viewBox="0 0 48 48" width="18" height="18" {...props}>
    <path
      fill="#FFC107"
      d="M43.6 20.5h-1.9V20.4H24v7.2h11.3c-1.6 4.6-6 7.9-11.3 7.9-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.1-5.1C33.6 6 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.6 15.7 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.1-5.1C33.6 6 29 4 24 4c-7.4 0-13.8 4.2-17.7 10.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5 0 9.6-1.9 13-5l-6-4.9c-2 1.4-4.6 2.3-7 2.3-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.9 39.8 16.4 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5h-1.9V20.4H24v7.2h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6 4.9C40.5 35.9 44 30.4 44 24c0-1.2-.1-2.4-.4-3.5z"
    />
  </svg>
);

export default function AuthForm({
  mode,
  background,
  onSubmit,
  onGoogle,
  defaultEmail = "",
}) {
  const isSignup = mode === "signup";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Your password must be at least 6 characters long.");
      return;
    }
    if (isSignup && displayName.trim().length < 1) {
      setError("Please tell us your name.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ email, password, displayName });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setSubmitting(true);
    try {
      await onGoogle();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <Image
        src={background}
        alt=""
        fill
        priority
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-ink" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="px-6 py-6 sm:px-16">
          <Link href="/" className="text-3xl font-black italic tracking-tight text-brand">
            BAYFLIX
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 pb-16">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md animate-scale-in rounded-md bg-black/75 p-8 sm:p-12 backdrop-blur-sm"
          >
            <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">
              {isSignup ? "Create your account" : "Sign In"}
            </h1>

            <div className="flex flex-col gap-3">
              {isSignup && (
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Full name"
                  autoComplete="name"
                  className="rounded bg-neutral-800 px-4 py-3.5 text-sm text-white placeholder-neutral-400 outline-none ring-1 ring-transparent focus:ring-white/40"
                />
              )}
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                autoComplete="email"
                className="rounded bg-neutral-800 px-4 py-3.5 text-sm text-white placeholder-neutral-400 outline-none ring-1 ring-transparent focus:ring-white/40"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="rounded bg-neutral-800 px-4 py-3.5 text-sm text-white placeholder-neutral-400 outline-none ring-1 ring-transparent focus:ring-white/40"
              />
            </div>

            {error && (
              <p className="mt-3 text-sm font-medium text-orange-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded bg-brand py-3.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Please wait…" : isSignup ? "Sign Up" : "Sign In"}
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-neutral-500">
              <span className="h-px flex-1 bg-neutral-700" />
              OR
              <span className="h-px flex-1 bg-neutral-700" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-3 rounded bg-white py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <p className="mt-8 text-sm text-neutral-400">
              {isSignup ? "Already have an account? " : "New to Bayflix? "}
              <Link
                href={isSignup ? "/signin" : "/signup"}
                className="font-medium text-white hover:underline"
              >
                {isSignup ? "Sign in now" : "Sign up now"}
              </Link>
              .
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}

function mapAuthError(err) {
  const code = err?.code || "";
  if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential")) {
    return "Incorrect email or password.";
  }
  if (code.includes("email-already-in-use")) {
    return "This email is already registered. Try signing in instead.";
  }
  if (code.includes("popup-closed-by-user")) {
    return "Sign-in was cancelled.";
  }
  if (code.includes("weak-password")) {
    return "Please choose a stronger password.";
  }
  return "Something went wrong. Please try again.";
}
