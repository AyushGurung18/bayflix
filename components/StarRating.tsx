"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { useWatchStatus } from "@/lib/watch-status-context";
import type { MediaType, TmdbItem } from "@/lib/types";

const GOLD = "#F5C518";

interface StarRatingProps {
  item: TmdbItem;
  mediaType: MediaType;
  size?: number;
}

export default function StarRating({ item, mediaType, size = 20 }: StarRatingProps) {
  const { configured, ratingsMap, rateTitle } = useWatchStatus();
  const [hovered, setHovered] = useState(0);

  if (!configured) return null;

  const current = ratingsMap.get(`${mediaType}:${item.id}`) || 0;
  const display = hovered || current;

  // Clicking the star that's already the current rating clears it.
  const handleClick = (star: number) => rateTitle(item, mediaType, star === current ? 0 : star);

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onMouseEnter={() => setHovered(star)}
            onClick={() => handleClick(star)}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            className="text-neutral-600"
          >
            <Star
              size={size}
              fill={star <= display ? GOLD : "none"}
              style={{ color: star <= display ? GOLD : undefined }}
            />
          </motion.button>
        ))}
      </div>
      {current > 0 && <span className="text-xs text-neutral-400">Your rating: {current}/5</span>}
    </div>
  );
}
