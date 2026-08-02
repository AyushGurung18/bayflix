"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, KeyRound } from "lucide-react";
import { applyActionCode, checkActionCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { mapAuthError } from "@/lib/auth-errors";

type Status = "working" | "reset-form" | "reset-done" | "verified" | "error";

const SUCCESS_COPY: Record<string, string> = {
  verifyEmail: "Your email is verified.",
  verifyAndChangeEmail: "Your email has been updated.",
  recoverEmail: "Your account recovery request was processed.",
};

// Generic landing page for every Firebase auth action link (password reset,
// email verification, email change) — Firebase appends ?mode=&oobCode= to
// whatever continue URL a link was generated with, so one page branches on
// `mode` instead of needing a separate route per email type. Parses
// window.location.search in an effect (not useSearchParams()) to match
// app/auth/finish/page.tsx's existing pattern, which avoids Next's
// Suspense-boundary requirement for search-param hooks.
export default function AuthActionPage() {
  const router = useRouter();
  const { currentUser, refreshEmailVerified } = useAuth();
  const [status, setStatus] = useState<Status>("working");
  const [mode, setMode] = useState("");
  const [oobCode, setOobCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode") || "";
    const code = params.get("oobCode") || "";
    // Responds to the incoming URL (an external browser API, not derivable
    // at render time) on mount — same justified pattern as app/auth/finish.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(m);
    setOobCode(code);

    if (!code) {
      setStatus("error");
      return;
    }

    if (m === "resetPassword") {
      checkActionCode(auth!, code)
        .then(() => setStatus("reset-form"))
        .catch(() => setStatus("error"));
      return;
    }

    if (m === "verifyEmail" || m === "verifyAndChangeEmail" || m === "recoverEmail") {
      applyActionCode(auth!, code)
        .then(() => setStatus("verified"))
        .catch(() => setStatus("error"));
      return;
    }

    setStatus("error");
  }, []);

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Your password must be at least 6 characters long.");
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(auth!, oobCode, password);
      setStatus("reset-done");
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = async () => {
    await refreshEmailVerified();
    router.replace("/browse");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-4 text-center">
      <Link href="/" className="mb-10 text-3xl font-black italic tracking-tight text-brand">
        BAYFLIX
      </Link>

      {status === "working" && (
        <>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="mt-5 text-neutral-400">One moment…</p>
        </>
      )}

      {status === "reset-form" && (
        <div className="w-full max-w-sm">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand">
            <KeyRound size={22} />
          </div>
          <h1 className="mb-2 text-xl font-semibold text-white">Choose a new password</h1>
          <form onSubmit={handleResetSubmit} className="mt-5 flex flex-col gap-3">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              type="password"
              autoComplete="new-password"
              autoFocus
              className="rounded bg-neutral-800 px-4 py-3.5 text-sm text-white placeholder-neutral-400 outline-none ring-1 ring-transparent focus:ring-white/40"
            />
            {error && <p className="text-sm font-medium text-orange-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-brand py-3.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save password"}
            </button>
          </form>
        </div>
      )}

      {status === "reset-done" && (
        <div className="max-w-sm">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand">
            <CheckCircle2 size={22} />
          </div>
          <h1 className="mb-2 text-xl font-semibold text-white">Password updated</h1>
          <p className="text-sm text-neutral-400">You can now sign in with your new password.</p>
          <Link
            href="/signin"
            className="mt-5 inline-block rounded bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Go to sign in
          </Link>
        </div>
      )}

      {status === "verified" && (
        <div className="max-w-sm">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand">
            <CheckCircle2 size={22} />
          </div>
          <h1 className="mb-2 text-xl font-semibold text-white">{SUCCESS_COPY[mode] || "All set."}</h1>
          {currentUser ? (
            <button
              onClick={handleContinue}
              className="mt-5 rounded bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Continue to Bayflix
            </button>
          ) : (
            <Link
              href="/signin"
              className="mt-5 inline-block rounded bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Go to sign in
            </Link>
          )}
        </div>
      )}

      {status === "error" && (
        <div className="max-w-sm">
          <p className="text-neutral-300">
            This link is invalid or has expired &mdash; links only work once.
          </p>
          <Link
            href="/signin"
            className="mt-5 inline-block rounded bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Back to sign in
          </Link>
        </div>
      )}
    </div>
  );
}
