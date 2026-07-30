"use client";

import { motion } from "framer-motion";
import { Plus, Check } from "lucide-react";
import { useWatchStatus } from "@/lib/watch-status-context";

export default function WatchlistButton({ item, mediaType, size = 15, variant = "icon", className = "" }) {
  const { configured, watchlistIds, toggleWatchlist } = useWatchStatus();
  if (!configured) return null;

  const inList = watchlistIds.has(`${mediaType}:${item.id}`);
  const label = inList ? "In My List" : "Add to My List";

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist(item, mediaType);
  };

  if (variant === "pill") {
    return (
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleClick}
        aria-label={label}
        className={`flex items-center gap-2 rounded border px-6 py-3 text-sm font-bold transition ${
          inList
            ? "border-white bg-white text-black"
            : "border-neutral-500 text-white hover:border-white"
        } ${className}`}
      >
        {inList ? <Check size={18} /> : <Plus size={18} />}
        {label}
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
        inList ? "border-white bg-white text-black" : "border-neutral-500 text-white hover:border-white"
      } ${className}`}
    >
      {inList ? <Check size={size} /> : <Plus size={size} />}
    </motion.button>
  );
}
