"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useAuth, MAGIC_EMAIL_KEY } from "@/lib/auth-context";

type Status = "working" | "need-email" | "error";

export default function FinishSignInPage() {
  const router = useRouter();
  const { isMagicLinkUrl, completeMagicLinkSignIn } = useAuth();
  const [status, setStatus] = useState<Status>("working");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const url = window.location.href;
    if (!isMagicLinkUrl(url)) {
      // Responds to the incoming URL (an external browser API, not
      // derivable at render time) on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("error");
      return;
    }
    const stored = localStorage.getItem(MAGIC_EMAIL_KEY);
    if (!stored) {
      // Opened on a different device/browser than the one that requested
      // the link — we never had anywhere to read the address back from.
      setStatus("need-email");
      return;
    }
    completeMagicLinkSignIn(stored, url)
      .then(() => router.replace("/browse"))
      .catch(() => setStatus("error"));
    // isMagicLinkUrl/completeMagicLinkSignIn/router are stable across
    // renders (useCallback/Next router) — only run this once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirmEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await completeMagicLinkSignIn(email, window.location.href);
      router.replace("/browse");
    } catch {
      setError("That didn't match the link. Double-check the email and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-4 text-center">
      <Link href="/" className="mb-10 text-3xl font-black italic tracking-tight text-brand">
        BAYFLIX
      </Link>

      {status === "working" && (
        <>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="mt-5 text-neutral-400">Signing you in…</p>
        </>
      )}

      {status === "need-email" && (
        <div className="w-full max-w-sm">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand mx-auto">
            <Mail size={22} />
          </div>
          <h1 className="mb-2 text-xl font-semibold text-white">Confirm your email</h1>
          <p className="mb-6 text-sm text-neutral-400">
            This link was opened somewhere new — enter the email you signed in with to finish.
          </p>
          <form onSubmit={handleConfirmEmail} className="flex flex-col gap-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              autoComplete="email"
              autoFocus
              className="rounded bg-neutral-800 px-4 py-3.5 text-sm text-white placeholder-neutral-400 outline-none ring-1 ring-transparent focus:ring-white/40"
            />
            {error && <p className="text-sm font-medium text-orange-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-brand py-3.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Continue"}
            </button>
          </form>
        </div>
      )}

      {status === "error" && (
        <div className="max-w-sm">
          <p className="text-neutral-300">
            This sign-in link is invalid or has expired &mdash; links only work once.
          </p>
          <Link
            href="/signin"
            className="mt-5 inline-block rounded bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Request a new link
          </Link>
        </div>
      )}
    </div>
  );
}
