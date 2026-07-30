"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, Film, Star } from "lucide-react";
import { posterUrl } from "@/lib/tmdb";

const HOVER_DELAY = 400; // Netflix-style pause before the preview pops up

export default function MovieCard({ item, mediaType, onTrailer, priority = false }) {
  const [expanded, setExpanded] = useState(false);
  const hoverTimeout = useRef(null);

  if (!item?.poster_path && !item?.backdrop_path) return null;

  const type = mediaType || item.media_type || "movie";
  const title = item.title || item.name || "Untitled";
  const date = item.release_date || item.first_air_date;
  const year = date ? date.slice(0, 4) : null;
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const infoHref = type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`;

  const handleEnter = () => {
    hoverTimeout.current = setTimeout(() => setExpanded(true), HOVER_DELAY);
  };
  const handleLeave = () => {
    clearTimeout(hoverTimeout.current);
    setExpanded(false);
  };

  return (
    <div
      className="relative w-[150px] shrink-0 sm:w-[190px]"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <Link href={infoHref} className="block overflow-hidden rounded-md bg-ink-card shadow-lg">
        <motion.div
          animate={{ opacity: expanded ? 0 : 1 }}
          transition={{ duration: 0.12 }}
          className="relative aspect-[2/3] w-full"
        >
          <Poster item={item} title={title} priority={priority} />
        </motion.div>
      </Link>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1.15, y: -14 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            style={{ transformOrigin: "top center" }}
            className="absolute inset-x-0 top-0 z-20 overflow-hidden rounded-md bg-ink-raised shadow-2xl ring-1 ring-white/10"
          >
            <Link href={infoHref} className="relative block aspect-[2/3] w-full overflow-hidden">
              <Poster item={item} title={title} />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-raised via-transparent to-transparent" />
            </Link>
            <div className="p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Link
                    href={`/watch/${item.id}?type=${type}&title=${encodeURIComponent(title)}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/80"
                    aria-label={`Play ${title}`}
                  >
                    <Play size={15} fill="black" className="ml-0.5" />
                  </Link>
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onTrailer?.(item, type)}
                  className="flex h-8 items-center gap-1 rounded-full border border-neutral-500 px-2.5 text-xs font-semibold text-white transition hover:border-white"
                >
                  Trailer
                </motion.button>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="ml-auto">
                  <Link
                    href={infoHref}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-500 text-white transition hover:border-white"
                    aria-label="More info"
                  >
                    <Info size={15} />
                  </Link>
                </motion.div>
              </div>
              <p className="truncate text-sm font-semibold text-white">{title}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                {rating && (
                  <span className="flex items-center gap-0.5 text-green-400">
                    <Star size={11} fill="currentColor" /> {rating}
                  </span>
                )}
                {year && <span>{year}</span>}
                <span className="rounded border border-neutral-500 px-1 text-[10px] uppercase">
                  {type === "tv" ? "Series" : "Movie"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Poster({ item, title, priority }) {
  if (!item.poster_path) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink-card text-neutral-600">
        <Film size={32} />
      </div>
    );
  }
  return (
    <Image
      src={posterUrl(item.poster_path, "w342")}
      alt={title}
      fill
      priority={priority}
      sizes="(max-width: 640px) 150px, 190px"
      className="object-cover"
    />
  );
}
