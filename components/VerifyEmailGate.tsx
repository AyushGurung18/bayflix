"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function VerifyEmailGate() {
  const router = useRouter();
  const { currentUser, refreshEmailVerified, resendVerificationEmail, logOut } = useAuth();
  const [status, setStatus] = useState<"idle" | "checking" | "resent" | "still-unverified">("idle");

  const handleCheck = async () => {
    setStatus("checking");
    const verified = await refreshEmailVerified();
    setStatus(verified ? "idle" : "still-unverified");
  };

  const handleResend = async () => {
    await resendVerificationEmail();
    setStatus("resent");
  };

  const handleSignOut = async () => {
    await logOut();
    router.push("/");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ink px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/15 text-brand">
        <MailCheck size={26} />
      </div>

      <div className="max-w-sm">
        <h1 className="text-xl font-semibold text-white">Verify your email</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">
          We sent a verification link to{" "}
          <span className="font-medium text-neutral-200">{currentUser?.email}</span>. Click it,
          then come back here.
        </p>
        {status === "still-unverified" && (
          <p className="mt-3 text-sm font-medium text-orange-400">
            Still not verified — check your inbox (and spam folder).
          </p>
        )}
        {status === "resent" && (
          <p className="mt-3 text-sm font-medium text-green-400">Verification email resent.</p>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={handleCheck}
          disabled={status === "checking"}
          className="rounded bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "checking" ? "Checking…" : "I've verified — continue"}
        </button>
        <button
          onClick={handleResend}
          className="text-sm font-medium text-neutral-400 hover:text-white"
        >
          Resend verification email
        </button>
        <button
          onClick={handleSignOut}
          className="text-sm font-medium text-neutral-500 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
