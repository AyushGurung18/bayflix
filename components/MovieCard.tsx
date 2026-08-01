"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, Film, Star } from "lucide-react";
import { posterUrl, backdropUrl, fetchMovieVideos, fetchTVVideos, pickTrailer } from "@/lib/tmdb";
import { BLUR_DATA_URL } from "@/lib/image-utils";
import { usePersistentMute } from "@/lib/use-persistent-mute";
import YouTubeBackground from "./YouTubeBackground";
import WatchlistButton from "./WatchlistButton";
import type { MediaType, TmdbItem } from "@/lib/types";

const HOVER_DELAY = 400; // Netflix-style pause before the preview pops up
const VIDEO_DELAY = 500; // extra beat after expanding before the trailer starts

const NEW_WINDOW_DAYS = 45;

interface MovieCardProps {
  item: TmdbItem;
  mediaType?: MediaType;
  onTrailer?: (item: TmdbItem, mediaType: MediaType) => void;
  priority?: boolean;
  rank?: number;
}

// Deliberately simple: expands in place, centered on and overlapping the
// card itself (like Netflix's own hover preview actually does) instead of
// portaling out to viewport coordinates or dodging to a side. Several
// attempts at "don't cover the card"/"portal to body" positioning each
// introduced their own failure (CSS clipping, portal not rendering) — this
// is the version with the fewest moving parts, built on the video embed
// that's confirmed working (Hero autoplays fine with the same component).
export default function MovieCard({ item, mediaType, onTrailer, priority = false, rank }: MovieCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null | undefined>(undefined); // undefined = not fetched yet, null = none found
  // Follows the same site-wide sound preference set via the Hero's speaker
  // icon (read once on mount, not live-synced across open instances) —
  // no separate toggle on the card itself, which would mean remounting
  // this specific iframe on every hover, on top of the one it already gets.
  const [muted] = usePersistentMute();
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const videoTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const type: MediaType = mediaType || item?.media_type || "movie";

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
  // "Is this recent" is inherently wall-clock-relative — worst case the
  // badge flips off near the exact day boundary between renders, which
  // isn't a correctness issue worth routing through state/effects for.
  // eslint-disable-next-line react-hooks/purity
  const daysSinceRelease = date ? (Date.now() - new Date(date).getTime()) / 86_400_000 : null;
  const isNew = daysSinceRelease !== null && daysSinceRelease >= 0 && daysSinceRelease <= NEW_WINDOW_DAYS;

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
    <div className={rank ? "flex shrink-0 items-end" : undefined}>
      {/* Its own box in normal flow, not an absolutely-positioned layer
          fighting the poster's z-index for visibility — a negative margin
          lets the card slide over its right portion instead, so a large,
          reliably-visible chunk of the number is always on screen no
          matter its exact rendered glyph width. */}
      {rank && (
        <div
          aria-hidden
          className="pointer-events-none relative z-0 -mr-5 select-none pb-1 font-black italic leading-none text-transparent sm:-mr-8"
          style={{
            fontSize: "clamp(90px, 11vw, 130px)",
            WebkitTextStroke: "3px rgba(255,255,255,0.4)",
          }}
        >
          {rank}
        </div>
      )}

      <div
        className="relative z-10 w-[200px] shrink-0 sm:w-[260px]"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <Link
          href={infoHref}
          className="relative block overflow-hidden rounded-md bg-ink-card shadow-lg transition-transform duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-black/60"
        >
          <div className="relative aspect-[2/3] w-full">
            <Poster item={item} title={title} priority={priority} />
          </div>
          {rating && (
            <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-green-400 backdrop-blur-sm">
              <Star size={10} fill="currentColor" /> {rating}
            </span>
          )}
          {isNew && (
            <span className="glow-brand absolute right-1.5 top-1.5 rounded bg-gradient-to-br from-brand to-brand-dark px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              New
            </span>
          )}
        </Link>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="absolute left-1/2 top-1/2 z-30 w-[360px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg bg-ink-raised shadow-2xl ring-1 ring-white/10 sm:w-[480px]"
            >
              <Link href={infoHref} className="relative block aspect-video w-full overflow-hidden bg-black">
                {showVideo && trailerKey ? (
                  <YouTubeBackground videoId={trailerKey} muted={muted} />
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
                      className="glow-white flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/85"
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
    </div>
  );
}

function Poster({ item, title, priority }: { item: TmdbItem; title: string; priority?: boolean }) {
  if (!item.poster_path) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink-card text-neutral-600">
        <Film size={32} />
      </div>
    );
  }
  return (
    <Image
      src={posterUrl(item.poster_path, "w342") ?? ""}
      alt={title}
      fill
      priority={priority}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      sizes="(max-width: 640px) 200px, 260px"
      className="object-cover"
    />
  );
}

function Backdrop({ item, title }: { item: TmdbItem; title: string }) {
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
      src={(item.backdrop_path ? backdropUrl(src, "w780") : posterUrl(src, "w342")) ?? ""}
      alt={title}
      fill
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      sizes="340px"
      className="object-cover"
    />
  );
}
