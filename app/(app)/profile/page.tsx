"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, Mail, Camera, KeyRound, X, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { mapAuthError } from "@/lib/auth-errors";
import { isValidEmail } from "@/lib/validators";
import { isBayflixApiConfigured, getAccount, updateAccount, avatarUrl, uploadAvatar } from "@/lib/bayflix-api";
import { GENDER_OPTIONS } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, logOut, updateFirebaseProfile, changeEmail, sendPasswordReset } = useAuth();
  const configured = isBayflixApiConfigured();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [accountLoading, setAccountLoading] = useState(configured);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  useEffect(() => {
    // Responds to auth state (currentUser), not derivable at render time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (currentUser) setName(currentUser.displayName || "");
  }, [currentUser]);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    getAccount()
      .then((account) => {
        if (cancelled || !account) return;
        setDob(account.dob || "");
        setGender(account.gender || "");
      })
      .finally(() => {
        if (!cancelled) setAccountLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [configured]);

  if (!currentUser) return null;

  const hasPasswordProvider = currentUser.providerData.some((p) => p.providerId === "password");
  const photoSrc = configured && avatarVersion ? avatarUrl(currentUser.uid, avatarVersion) : currentUser.photoURL;

  const handleLogout = async () => {
    await logOut();
    router.push("/");
  };

  const handleAvatarClick = () => {
    if (!configured || avatarUploading) return;
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setAvatarUploading(true);
    try {
      const result = await uploadAvatar(file);
      if (!result) throw new Error("Failed to upload photo.");
      const version = Date.now();
      await updateFirebaseProfile({ photoURL: avatarUrl(currentUser.uid, version) ?? undefined });
      setAvatarVersion(version);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaveMessage("");
    setSaving(true);
    try {
      if (name.trim() && name.trim() !== currentUser.displayName) {
        await updateFirebaseProfile({ displayName: name.trim() });
      }
      if (configured) {
        await updateAccount({ dob: dob || null, gender: gender || null });
      }
      setSaveMessage("Saved.");
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!currentUser.email) return;
    setError("");
    try {
      await sendPasswordReset(currentUser.email);
      setPasswordResetSent(true);
    } catch (err) {
      setError(mapAuthError(err));
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-12 sm:px-0">
      <h1 className="mb-8 text-2xl font-bold sm:text-3xl">Account</h1>

      <div className="flex items-center gap-6 rounded-lg bg-ink-card p-6">
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={!configured}
          className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-brand disabled:cursor-default sm:h-28 sm:w-28"
        >
          {photoSrc ? (
            <Image src={photoSrc} alt="" fill className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <User size={40} className="text-white" />
            </span>
          )}
          {configured && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100">
              {avatarUploading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Camera size={22} className="text-white" />
              )}
            </span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAvatarChange}
          className="hidden"
        />
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold">{currentUser.displayName || "Bayflix Member"}</p>
          <div className="mt-1 flex items-center gap-2 text-sm text-neutral-400">
            <Mail size={14} className="shrink-0" />
            <span className="truncate">{currentUser.email}</span>
            <button
              type="button"
              onClick={() => setEmailModalOpen(true)}
              className="shrink-0 font-medium text-neutral-300 underline decoration-neutral-600 underline-offset-2 hover:text-white"
            >
              Change
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-4 rounded-lg bg-ink-card p-6">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded border border-white/10 bg-ink px-3.5 py-2.5 text-sm text-white outline-none placeholder-neutral-500 focus:border-white/40"
          />
        </div>

        {configured && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Date of birth
              </label>
              <input
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                type="date"
                disabled={accountLoading}
                className="w-full rounded border border-white/10 bg-ink px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/40 disabled:opacity-50 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                disabled={accountLoading}
                className="w-full rounded border border-white/10 bg-ink px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/40 disabled:opacity-50"
              >
                <option value="">Prefer not to say</option>
                {GENDER_OPTIONS.filter((g) => g !== "Prefer not to say").map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {error && <p className="text-sm font-medium text-orange-400">{error}</p>}
        {saveMessage && <p className="text-sm font-medium text-green-400">{saveMessage}</p>}

        <button
          type="submit"
          disabled={saving}
          className="self-start rounded bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      {hasPasswordProvider && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-lg bg-ink-card p-6">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">Password</p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {passwordResetSent
                ? "Check your inbox for a reset link."
                : "Send yourself a link to set a new password."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSendPasswordReset}
            disabled={passwordResetSent}
            className="flex shrink-0 items-center gap-2 rounded border border-neutral-600 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <KeyRound size={15} /> Change password
          </button>
        </div>
      )}

      <button
        onClick={handleLogout}
        className="mt-6 flex items-center gap-2 rounded border border-neutral-600 px-5 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-white hover:text-white"
      >
        <LogOut size={16} /> Sign out of Bayflix
      </button>

      <AnimatePresence>
        {emailModalOpen && (
          <ChangeEmailModal
            currentEmail={currentUser.email || ""}
            onClose={() => setEmailModalOpen(false)}
            onChangeEmail={changeEmail}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ChangeEmailModal({
  currentEmail,
  onClose,
  onChangeEmail,
}: {
  currentEmail: string;
  onClose: () => void;
  onChangeEmail: (newEmail: string) => Promise<void>;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isValidEmail(newEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (newEmail === currentEmail) {
      setError("That's already your email.");
      return;
    }
    setSubmitting(true);
    try {
      await onChangeEmail(newEmail);
      setSent(true);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-white/10 bg-ink-raised p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Change email</h2>
          <button onClick={onClose} className="text-neutral-500 transition hover:text-white">
            <X size={20} />
          </button>
        </div>

        {sent ? (
          <p className="text-sm leading-relaxed text-neutral-300">
            Check your inbox at <span className="font-medium text-white">{newEmail}</span> to confirm the
            change — your email stays {currentEmail} until then.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="New email"
              type="email"
              autoComplete="email"
              autoFocus
              className="w-full rounded border border-white/15 bg-ink-card px-3 py-2.5 text-sm text-white outline-none placeholder-neutral-500 focus:border-white/40"
            />
            {error && <p className="text-sm font-medium text-orange-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="glow-brand flex w-full items-center justify-center gap-2 rounded bg-gradient-to-br from-brand to-brand-dark px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={16} /> {submitting ? "Sending…" : "Send confirmation link"}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
