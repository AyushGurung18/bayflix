"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, Film, Star, Volume2, VolumeX } from "lucide-react";
import { posterUrl, backdropUrl, fetchMovieVideos, fetchTVVideos, pickTrailer } from "@/lib/tmdb";
import WatchlistButton from "./WatchlistButton";

const HOVER_DELAY = 400; // Netflix-style pause before the preview pops up
const VIDEO_DELAY = 500; // extra beat after expanding before the trailer starts

export default function MovieCard({ item, mediaType, onTrailer, priority = false }) {
  const [expanded, setExpanded] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [muted, setMuted] = useState(true);
  const [trailerKey, setTrailerKey] = useState(undefined); // undefined = not fetched yet, null = none found
  const hoverTimeout = useRef(null);
  const videoTimeout = useRef(null);

  const type = mediaType || item?.media_type || "movie";

  useEffect(() => {
    if (!expanded || trailerKey !== undefined) return;
    let cancelled = false;
    const fetcher = type === "tv" ? fetchTVVideos : fetchMovieVideos;
    fetcher(item.id)
      .then((videos) => {
        if (cancelled) return;
        setTrailerKey(pickTrailer(videos)?.key ?? null);
      })
      .catch(() => !cancelled && setTrailerKey(null));
    return () => {
      cancelled = true;
    };
  }, [expanded, trailerKey, type, item?.id]);

  if (!item?.poster_path && !item?.backdrop_path) return null;

  const title = item.title || item.name || "Untitled";
  const date = item.release_date || item.first_air_date;
  const year = date ? date.slice(0, 4) : null;
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const infoHref = type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`;

  const handleEnter = () => {
    hoverTimeout.current = setTimeout(() => {
      setExpanded(true);
      videoTimeout.current = setTimeout(() => setShowVideo(true), VIDEO_DELAY);
    }, HOVER_DELAY);
  };
  const handleLeave = () => {
    clearTimeout(hoverTimeout.current);
    clearTimeout(videoTimeout.current);
    setExpanded(false);
    setShowVideo(false);
  };

  return (
    <div
      className="relative w-[180px] shrink-0 sm:w-[230px]"
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
            animate={{ opacity: 1, scale: 1.1, y: -14 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            style={{ transformOrigin: "top center" }}
            className="absolute inset-x-0 top-0 z-20 overflow-hidden rounded-md bg-ink-raised shadow-2xl ring-1 ring-white/10"
          >
            <Link href={infoHref} className="relative block aspect-video w-full overflow-hidden bg-black">
              {showVideo && trailerKey ? (
                <>
                  <iframe
                    key={trailerKey + muted}
                    title={`${title} trailer preview`}
                    src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${
                      muted ? 1 : 0
                    }&controls=0&loop=1&playlist=${trailerKey}&modestbranding=1&rel=0&playsinline=1`}
                    allow="autoplay; encrypted-media"
                    className="pointer-events-none absolute inset-0 h-full w-full scale-125 border-0"
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setMuted((m) => !m);
                    }}
                    aria-label={muted ? "Unmute preview" : "Mute preview"}
                    className="absolute bottom-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-black/60 text-white transition hover:border-white"
                  >
                    {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </button>
                </>
              ) : (
                <Backdrop item={item} title={title} />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-raised via-transparent to-transparent" />
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
                <div className="ml-auto flex items-center gap-1.5">
                  <WatchlistButton item={item} mediaType={type} size={14} />
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Link
                      href={infoHref}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-500 text-white transition hover:border-white"
                      aria-label="More info"
                    >
                      <Info size={15} />
                    </Link>
                  </motion.div>
                </div>
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
      sizes="(max-width: 640px) 180px, 230px"
      className="object-cover"
    />
  );
}

function Backdrop({ item, title }) {
  const src = item.backdrop_path || item.poster_path;
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink-card text-neutral-600">
        <Film size={32} />
      </div>
    );
  }
  return (
    <Image
      src={item.backdrop_path ? backdropUrl(src, "w780") : posterUrl(src, "w342")}
      alt={title}
      fill
      sizes="230px"
      className="object-cover"
    />
  );
}
