"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useWatchStatus } from "@/lib/watch-status-context";
import type { MediaType, TmdbItem } from "@/lib/types";

const STAR_PATH =
  "M12 2.75l2.98 6.28 6.92.72-5.15 4.79 1.42 6.86L12 17.98l-6.17 3.42 1.42-6.86-5.15-4.79 6.92-.72L12 2.75z";

function StarGlyph({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={filled ? { filter: "drop-shadow(0 0 5px rgba(245, 197, 24, 0.7))" } : undefined}
    >
      <path
        d={STAR_PATH}
        fill={filled ? "url(#bayflix-star-gradient)" : "rgba(255,255,255,0.06)"}
        stroke={filled ? "none" : "rgba(255,255,255,0.28)"}
        strokeWidth={filled ? 0 : 1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface StarRatingProps {
  item: TmdbItem;
  mediaType: MediaType;
  size?: number;
}

export default function StarRating({ item, mediaType, size = 22 }: StarRatingProps) {
  const { configured, ratingsMap, rateTitle } = useWatchStatus();
  const [hovered, setHovered] = useState(0);

  if (!configured) return null;

  const current = ratingsMap.get(`${mediaType}:${item.id}`) || 0;
  const display = hovered || current;

  // Clicking the star that's already the current rating clears it.
  const handleClick = (star: number) => rateTitle(item, mediaType, star === current ? 0 : star);

  return (
    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 py-1.5 pl-3 pr-4 backdrop-blur-sm">
      <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            whileHover={{ scale: 1.3, y: -3 }}
            whileTap={{ scale: 0.85 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            onMouseEnter={() => setHovered(star)}
            onClick={() => handleClick(star)}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            className="p-0.5"
          >
            <StarGlyph filled={star <= display} size={size} />
          </motion.button>
        ))}
      </div>
      {current > 0 ? (
        <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-xs font-bold text-transparent">
          {current}.0
        </span>
      ) : (
        <span className="text-xs font-medium text-neutral-500">Rate this</span>
      )}
    </div>
  );
}
