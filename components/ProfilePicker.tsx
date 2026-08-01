"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { useProfiles } from "@/lib/profile-context";
import type { Profile } from "@/lib/types";

const EMOJIS = ["🎬", "🍿", "🦸", "🐉", "🎮", "🌟", "🦄", "🎭", "🚀", "🐱", "🍕", "👾"];
const COLORS = [
  "#e50914",
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0d9488",
  "#db2777",
  "#ca8a04",
];

interface Wipe {
  x: number;
  y: number;
  radius: number;
  color: string;
}

const WIPE_DURATION = 0.6;

export default function ProfilePicker() {
  const router = useRouter();
  const { profiles, loading, selectProfile, addProfile, removeProfile } = useProfiles();
  const [wipe, setWipe] = useState<Wipe | null>(null);
  const [managing, setManaging] = useState(false);
  const [creating, setCreating] = useState(false);

  const handlePick = (profile: Profile, e: MouseEvent<HTMLButtonElement>) => {
    if (managing || wipe) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    setWipe({ x, y, radius, color: profile.avatar_color });
    selectProfile(profile.id);
    setTimeout(() => router.push("/browse"), WIPE_DURATION * 1000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-4 py-16">
      <motion.h1
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-2xl font-semibold text-neutral-100 sm:mb-14 sm:text-4xl"
      >
        Who&rsquo;s Watching?
      </motion.h1>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="flex flex-wrap items-start justify-center gap-6 sm:gap-8"
      >
        <AnimatePresence>
          {profiles.map((profile) => (
            <motion.div
              key={profile.id}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              exit={{ opacity: 0, scale: 0.8 }}
              animate={wipe ? { opacity: wipe.color === profile.avatar_color ? 1 : 0.15 } : undefined}
              transition={{ duration: 0.3 }}
              className="group relative flex flex-col items-center gap-3"
            >
              <button
                onClick={(e) => handlePick(profile, e)}
                disabled={!!wipe}
                className="relative flex h-24 w-24 items-center justify-center rounded-xl text-4xl shadow-lg ring-2 ring-transparent transition-all group-hover:scale-105 group-hover:ring-white sm:h-32 sm:w-32 sm:text-5xl"
                style={{ backgroundColor: profile.avatar_color }}
              >
                {profile.avatar_emoji}
                {managing && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      removeProfile(profile.id);
                    }}
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black text-white ring-2 ring-ink transition hover:bg-red-600"
                  >
                    <Trash2 size={14} />
                  </span>
                )}
              </button>
              <span className="text-sm font-medium text-neutral-300 group-hover:text-white sm:text-base">
                {profile.name}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {profiles.length < 5 && !wipe && (
          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="flex flex-col items-center gap-3"
          >
            <button
              onClick={() => setCreating(true)}
              className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-neutral-600 text-neutral-500 transition hover:border-white hover:text-white sm:h-32 sm:w-32"
            >
              <Plus size={36} />
            </button>
            <span className="text-sm font-medium text-neutral-500 sm:text-base">Add Profile</span>
          </motion.div>
        )}
      </motion.div>

      {!wipe && profiles.length > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={() => setManaging((m) => !m)}
          className={`mt-14 flex items-center gap-2 rounded border px-6 py-2.5 text-sm font-semibold uppercase tracking-wide transition ${
            managing
              ? "border-white bg-white text-black"
              : "border-neutral-500 text-neutral-400 hover:border-white hover:text-white"
          }`}
        >
          <Pencil size={14} /> {managing ? "Done" : "Manage Profiles"}
        </motion.button>
      )}

      <AnimatePresence>
        {creating && <CreateProfileModal onClose={() => setCreating(false)} onCreate={addProfile} />}
      </AnimatePresence>

      {/* A real circular reveal wipe, expanding from the clicked avatar's
          exact screen position out past the farthest corner — reads as
          "zooming into" that profile instead of a flex item awkwardly
          scaling up in place (which fought the layout and clipped oddly). */}
      <AnimatePresence>
        {wipe && (
          <motion.div
            initial={{ clipPath: `circle(0px at ${wipe.x}px ${wipe.y}px)` }}
            animate={{ clipPath: `circle(${wipe.radius}px at ${wipe.x}px ${wipe.y}px)` }}
            transition={{ duration: WIPE_DURATION, ease: [0.65, 0, 0.35, 1] }}
            className="fixed inset-0 z-[999]"
            style={{ backgroundColor: wipe.color }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateProfileModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, color: string, emoji: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    await onCreate(name.trim(), color, emoji);
    setSaving(false);
    onClose();
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
          <h2 className="text-lg font-semibold text-white">Add Profile</h2>
          <button onClick={onClose} className="text-neutral-500 transition hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div
          className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-xl text-4xl shadow-lg"
          style={{ backgroundColor: color }}
        >
          {emoji}
        </div>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          maxLength={40}
          className="mb-5 w-full rounded border border-white/15 bg-ink-card px-3 py-2.5 text-sm text-white outline-none placeholder-neutral-500 focus:border-white/40"
        />

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Avatar</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition ${
                emoji === e ? "bg-white/20 ring-1 ring-white" : "hover:bg-white/10"
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Color</p>
        <div className="mb-6 flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`h-8 w-8 rounded-full transition ${
                color === c ? "ring-2 ring-white ring-offset-2 ring-offset-ink-raised" : ""
              }`}
              aria-label={c}
            />
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="glow-brand flex w-full items-center justify-center gap-2 rounded bg-gradient-to-br from-brand to-brand-dark px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check size={16} /> {saving ? "Creating…" : "Create Profile"}
        </button>
      </motion.div>
    </motion.div>
  );
}
