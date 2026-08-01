"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useInView } from "framer-motion";
import {
  Play,
  Clapperboard,
  User,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Globe,
  BadgeCheck,
  Layers,
  Tv,
  Volume2,
  VolumeX,
  ShieldAlert,
} from "lucide-react";
import { SkeletonDetail } from "./Skeletons";
import MovieRow from "./MovieRow";
import TrailerModal from "./TrailerModal";
import CircularRatings from "./CircularRatings";
import WatchProviders from "./WatchProviders";
import ReviewsSection from "./ReviewsSection";
import SeasonsEpisodes from "./SeasonsEpisodes";
import YouTubeLivePlayer from "./YouTubeLivePlayer";
import WatchlistButton from "./WatchlistButton";
import StarRating from "./StarRating";
import { useTrailer } from "@/lib/use-trailer";
import {
  backdropUrl,
  posterUrl,
  pickTrailer,
  pickCertification,
  fetchMovieDetails,
  fetchTVDetails,
} from "@/lib/tmdb";
import { getRatings } from "@/lib/bayflix-api";
import { BLUR_DATA_URL } from "@/lib/image-utils";
import { usePersistentMute } from "@/lib/use-persistent-mute";
import type { MediaType, RatingsResult, TmdbDetails } from "@/lib/types";

const HERO_TRAILER_DELAY = 3000;

function formatRuntime(minutes?: number) {
  if (!minutes) return null;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function formatMoney(amount?: number) {
  if (!amount) return "—";
  return `$${amount.toLocaleString()}`;
}

interface MediaDetailProps {
  id: string;
  mediaType: MediaType;
}

export default function MediaDetail({ id, mediaType }: MediaDetailProps) {
  const [data, setData] = useState<TmdbDetails | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [ratings, setRatings] = useState<RatingsResult | null>(null);
  const [showHeroVideo, setShowHeroVideo] = useState(false);
  const [heroMuted, toggleHeroMuted] = usePersistentMute();
  const heroRef = useRef<HTMLElement>(null);
  const heroInView = useInView(heroRef, { amount: 0.4 });
  const { trailer, openTrailer, openTrailerDirect, closeTrailer } = useTrailer();

  useEffect(() => {
    let cancelled = false;
    const fetcher = mediaType === "tv" ? fetchTVDetails : fetchMovieDetails;
    fetcher(id)
      .then((details) => {
        if (cancelled) return;
        if (details?.success === false) {
          setNotFound(true);
        } else {
          setData(details);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, mediaType]);

  useEffect(() => {
    if (!data) return;
    const trailer = pickTrailer(data.videos);
    if (!trailer) return;
    const timer = setTimeout(() => setShowHeroVideo(true), HERO_TRAILER_DELAY);
    return () => clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    const imdbId = data.imdb_id || data.external_ids?.imdb_id;
    const title = data.title || data.name;
    const year = (data.release_date || data.first_air_date || "").slice(0, 4);
    getRatings({ tmdbId: data.id, mediaType, imdbId, title, year }).then(
      (r) => !cancelled && setRatings(r)
    );
    return () => {
      cancelled = true;
    };
  }, [data, mediaType]);

  if (notFound) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-neutral-400">
        We couldn&rsquo;t find that title.
      </div>
    );
  }
  if (!data) return <SkeletonDetail />;

  const isTV = mediaType === "tv";
  const title = data.title || data.name || "";
  const date = data.release_date || data.first_air_date;
  const trailerInfo = pickTrailer(data.videos);
  const certification = pickCertification(data, isTV);
  const cast = (data.credits?.cast ?? []).slice(0, 10);
  const recommendations = (data.recommendations?.results ?? []).filter(
    (r) => r.poster_path || r.backdrop_path
  );

  return (
    <div className="pb-16">
      <section ref={heroRef} className="relative h-[46vw] max-h-[70vh] min-h-[360px] w-full overflow-hidden">
        {data.backdrop_path && (
          <Image
            src={backdropUrl(data.backdrop_path) ?? ""}
            alt=""
            fill
            priority
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover object-top"
          />
        )}
        {showHeroVideo && trailerInfo && (
          <YouTubeLivePlayer videoId={trailerInfo.key} muted={heroMuted} playing={heroInView} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-transparent to-transparent" />
        {showHeroVideo && trailerInfo && (
          <button
            onClick={toggleHeroMuted}
            aria-label={heroMuted ? "Unmute trailer" : "Mute trailer"}
            className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/50 text-white transition hover:border-white sm:right-10"
          >
            {heroMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        )}
      </section>

      <div className="relative z-10 -mt-24 flex flex-col gap-6 px-4 sm:-mt-32 sm:flex-row sm:px-10">
        <div className="relative mx-auto h-64 w-44 shrink-0 overflow-hidden rounded-lg shadow-2xl sm:mx-0 sm:h-72 sm:w-48">
          {data.poster_path ? (
            <Image
              src={posterUrl(data.poster_path, "w500") ?? ""}
              alt={title}
              fill
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-ink-card text-neutral-600">
              No poster
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black sm:text-4xl">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-300">
            {date && <span>{date.slice(0, 4)}</span>}
            {!isTV && data.runtime ? <span>{formatRuntime(data.runtime)}</span> : null}
            {isTV && (
              <span>
                {data.number_of_seasons} season{data.number_of_seasons === 1 ? "" : "s"} &middot;{" "}
                {data.number_of_episodes} episodes
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-5">
            <CircularRatings ratings={ratings} tmdbScore={data.vote_average} />
            <StarRating item={data} mediaType={mediaType} />
          </div>

          {data.genres && data.genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.genres.map((g) => (
                <span
                  key={g.id}
                  className="rounded-full border border-neutral-600 px-3 py-1 text-xs text-neutral-300"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-200 sm:text-base">
            {data.overview}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/watch/${data.id}?type=${mediaType}&title=${encodeURIComponent(title)}`}
              className="glow-brand flex items-center gap-2 rounded bg-gradient-to-br from-brand to-brand-dark px-6 py-3 text-sm font-bold text-white transition-all hover:scale-[1.03] active:scale-95"
            >
              <Play size={18} fill="white" /> Play Now
            </Link>
            {trailerInfo && (
              <button
                onClick={() => openTrailerDirect(trailerInfo.key, title)}
                className="flex items-center gap-2 rounded border border-neutral-500 px-6 py-3 text-sm font-bold text-white transition-all hover:scale-[1.03] hover:border-white active:scale-95"
              >
                <Clapperboard size={18} /> Watch Trailer
              </button>
            )}
            <WatchlistButton item={data} mediaType={mediaType} variant="pill" />
          </div>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row">
            <div className="min-w-0 lg:w-[420px] lg:shrink-0">
              {!isTV && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
                  <StatCard icon={Calendar} label="Release Date" value={date || "—"} />
                  <StatCard icon={Clock} label="Runtime" value={formatRuntime(data.runtime) || "—"} />
                  <StatCard icon={DollarSign} label="Budget" value={formatMoney(data.budget)} />
                  <StatCard icon={TrendingUp} label="Revenue" value={formatMoney(data.revenue)} />
                  <StatCard icon={Globe} label="Language" value={data.spoken_languages?.[0]?.name || "—"} />
                  <StatCard icon={BadgeCheck} label="Status" value={data.status || "—"} />
                  <StatCard icon={ShieldAlert} label="Certification" value={certification || "Not Rated"} />
                </div>
              )}
              {isTV && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
                  <StatCard icon={Calendar} label="First Air Date" value={date || "—"} />
                  <StatCard icon={Layers} label="Seasons" value={data.number_of_seasons ?? "—"} />
                  <StatCard icon={Tv} label="Episodes" value={data.number_of_episodes ?? "—"} />
                  <StatCard icon={BadgeCheck} label="Status" value={data.status || "—"} />
                  <StatCard icon={ShieldAlert} label="Certification" value={certification || "Not Rated"} />
                </div>
              )}

              <WatchProviders results={data["watch/providers"]?.results} />
            </div>

            <ReviewsSection reviews={data.reviews?.results} className="min-w-0 flex-1" />
          </div>
        </div>
      </div>

      {cast.length > 0 && (
        <div className="mt-10 px-4 sm:px-10">
          <h2 className="mb-4 text-xl font-semibold">Cast</h2>
          <div className="no-scrollbar flex gap-5 overflow-x-auto pb-2">
            {cast.map((person) => (
              <Link
                key={person.id}
                href={`/person/${person.id}`}
                className="group w-28 shrink-0 text-center sm:w-36"
              >
                <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-full bg-ink-card ring-1 ring-white/10 transition group-hover:ring-2 group-hover:ring-white/60 sm:h-36 sm:w-36">
                  {person.profile_path ? (
                    <Image
                      src={posterUrl(person.profile_path, "w185") ?? ""}
                      alt={person.name}
                      fill
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      className="object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-600">
                      <User size={28} />
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-medium text-neutral-200 group-hover:text-white">
                  {person.name}
                </p>
                <p className="truncate text-xs text-neutral-500">{person.character}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isTV && <SeasonsEpisodes key={data.id} tvId={data.id} seasons={data.seasons} />}

      {recommendations.length > 0 && (
        <div className="mt-6">
          <MovieRow
            title="More Like This"
            items={recommendations}
            mediaType={mediaType}
            onTrailer={openTrailer}
          />
        </div>
      )}

      <TrailerModal videoKey={trailer?.key} title={trailer?.title} onClose={closeTrailer} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-white/20 hover:bg-white/[0.06]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-brand">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
        <p className="truncate text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}
