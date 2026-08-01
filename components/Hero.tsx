"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { Play, Info, Volume2, VolumeX, Clapperboard, Star } from "lucide-react";
import { backdropUrl, pickTrailer } from "@/lib/tmdb";
import { BLUR_DATA_URL } from "@/lib/image-utils";
import { usePersistentMute } from "@/lib/use-persistent-mute";
import YouTubeBackground from "./YouTubeBackground";
import type { MediaType, TmdbDetails } from "@/lib/types";

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

interface HeroProps {
  item: TmdbDetails | null;
  mediaType?: MediaType;
  onTrailer?: (key: string, title: string) => void;
}

export default function Hero({ item: media, mediaType = "movie", onTrailer }: HeroProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [muted, toggleMuted] = usePersistentMute();

  const trailer = pickTrailer(media?.videos);

  useEffect(() => {
    // Deliberate reset in response to the trailer itself changing (new
    // featured title), not derivable at render time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVideoFailed(false);
    if (!trailer) return;
    const timer = setTimeout(() => setShowVideo(true), 1500);
    return () => clearTimeout(timer);
  }, [trailer]);

  if (!media) return null;

  const title = media.title || media.name || "";
  const overview = media.overview;
  const infoHref = mediaType === "tv" ? `/tv/${media.id}` : `/movie/${media.id}`;
  const year = (media.release_date || media.first_air_date || "").slice(0, 4);
  const match = media.vote_average ? Math.round(media.vote_average * 10) : null;
  const genres = (media.genres ?? []).slice(0, 3).map((g) => g.name);

  return (
    <section className="relative h-[62vw] max-h-[85vh] min-h-[420px] w-full overflow-hidden">
      <div className="absolute inset-0">
        {media.backdrop_path && (
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1 }}
            animate={{ scale: showVideo && !videoFailed ? 1 : 1.08 }}
            transition={{ duration: 20, ease: "linear" }}
          >
            <Image
              src={backdropUrl(media.backdrop_path) ?? ""}
              alt=""
              fill
              priority
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="object-cover object-top"
            />
          </motion.div>
        )}
        {showVideo && trailer && !videoFailed && (
          <motion.div
            key={trailer.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            <YouTubeBackground
              videoId={trailer.key}
              muted={muted}
              className="yt-cover-frame absolute inset-0"
              onUnavailable={() => setVideoFailed(true)}
            />
          </motion.div>
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/10 to-transparent" />
      <div
        className="pointer-events-none absolute -bottom-1/4 -left-1/4 h-[70%] w-[60%] rounded-full opacity-30 blur-[100px]"
        style={{ background: "radial-gradient(circle, var(--color-brand) 0%, transparent 70%)" }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex h-full flex-col justify-end gap-3 px-4 pb-16 sm:px-10 sm:pb-24"
      >
        <motion.h1
          variants={item}
          className="max-w-2xl text-3xl font-black leading-[1.05] text-shadow sm:text-5xl md:text-6xl"
        >
          {title}
        </motion.h1>

        {(match || year || genres.length > 0) && (
          <motion.div
            variants={item}
            className="flex flex-wrap items-center gap-3 text-sm font-semibold text-shadow sm:text-base"
          >
            {match && (
              <span className="flex items-center gap-1 text-green-400">
                <Star size={15} fill="currentColor" /> {match}% Match
              </span>
            )}
            {year && <span className="text-neutral-200">{year}</span>}
            {genres.length > 0 && (
              <span className="text-neutral-300">{genres.join(" • ")}</span>
            )}
          </motion.div>
        )}

        <motion.p
          variants={item}
          className="max-w-xl text-sm text-neutral-200 text-shadow line-clamp-3 sm:text-base"
        >
          {overview}
        </motion.p>

        <motion.div variants={item} className="mt-2 flex flex-wrap items-center gap-3">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }}>
            <Link
              href={`/watch/${media.id}?type=${mediaType}&title=${encodeURIComponent(title)}`}
              className="glow-white flex items-center gap-2 rounded bg-white px-5 py-2.5 text-sm font-bold text-black transition-shadow hover:bg-white/90 sm:px-6 sm:py-3 sm:text-base"
            >
              <Play size={20} fill="black" /> Play
            </Link>
          </motion.div>
          {trailer && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => onTrailer?.(trailer.key, title)}
              className="flex items-center gap-2 rounded border border-white/15 bg-neutral-500/30 px-5 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:border-white/40 hover:bg-neutral-500/50 sm:px-6 sm:py-3 sm:text-base"
            >
              <Clapperboard size={20} /> Trailer
            </motion.button>
          )}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }}>
            <Link
              href={infoHref}
              className="flex items-center gap-2 rounded border border-white/15 bg-neutral-500/30 px-5 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:border-white/40 hover:bg-neutral-500/50 sm:px-6 sm:py-3 sm:text-base"
            >
              <Info size={20} /> More Info
            </Link>
          </motion.div>

          {showVideo && trailer && !videoFailed && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMuted}
              aria-label={muted ? "Unmute preview" : "Mute preview"}
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/50 text-white transition hover:border-white"
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
}
