"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Clapperboard } from "lucide-react";
import { SkeletonDetail } from "./Skeletons";
import MovieRow from "./MovieRow";
import TrailerModal from "./TrailerModal";
import RatingsBadges from "./RatingsBadges";
import WatchlistButton from "./WatchlistButton";
import StarRating from "./StarRating";
import { useTrailer } from "@/lib/use-trailer";
import { backdropUrl, posterUrl, pickTrailer, fetchMovieDetails, fetchTVDetails } from "@/lib/tmdb";
import { getRatings } from "@/lib/bayflix-api";
import type { MediaType, RatingsResult, TmdbDetails } from "@/lib/types";

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
  const cast = (data.credits?.cast ?? []).slice(0, 10);
  const recommendations = (data.recommendations?.results ?? []).filter(
    (r) => r.poster_path || r.backdrop_path
  );

  return (
    <div className="pb-16">
      <section className="relative h-[46vw] max-h-[70vh] min-h-[360px] w-full">
        {data.backdrop_path && (
          <Image
            src={backdropUrl(data.backdrop_path) ?? ""}
            alt=""
            fill
            priority
            className="object-cover object-top"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-transparent to-transparent" />
      </section>

      <div className="relative z-10 -mt-24 flex flex-col gap-6 px-4 sm:-mt-32 sm:flex-row sm:px-10">
        <div className="relative mx-auto h-64 w-44 shrink-0 overflow-hidden rounded-lg shadow-2xl sm:mx-0 sm:h-72 sm:w-48">
          {data.poster_path ? (
            <Image src={posterUrl(data.poster_path, "w500") ?? ""} alt={title} fill className="object-cover" />
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

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <RatingsBadges ratings={ratings} tmdbScore={data.vote_average} />
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
              className="flex items-center gap-2 rounded bg-brand px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
            >
              <Play size={18} fill="white" /> Play Now
            </Link>
            {trailerInfo && (
              <button
                onClick={() => openTrailerDirect(trailerInfo.key, title)}
                className="flex items-center gap-2 rounded border border-neutral-500 px-6 py-3 text-sm font-bold text-white transition hover:border-white"
              >
                <Clapperboard size={18} /> Watch Trailer
              </button>
            )}
            <WatchlistButton item={data} mediaType={mediaType} variant="pill" />
          </div>

          {!isTV && (
            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:max-w-md">
              <DetailRow label="Release Date" value={date || "—"} />
              <DetailRow label="Runtime" value={formatRuntime(data.runtime) || "—"} />
              <DetailRow label="Budget" value={formatMoney(data.budget)} />
              <DetailRow label="Revenue" value={formatMoney(data.revenue)} />
              <DetailRow label="Language" value={data.spoken_languages?.[0]?.name || "—"} />
              <DetailRow label="Status" value={data.status || "—"} />
            </dl>
          )}
          {isTV && (
            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:max-w-md">
              <DetailRow label="First Air Date" value={date || "—"} />
              <DetailRow label="Seasons" value={data.number_of_seasons ?? "—"} />
              <DetailRow label="Episodes" value={data.number_of_episodes ?? "—"} />
              <DetailRow label="Status" value={data.status || "—"} />
            </dl>
          )}
        </div>
      </div>

      {cast.length > 0 && (
        <div className="mt-10 px-4 sm:px-10">
          <h2 className="mb-4 text-xl font-semibold">Cast</h2>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {cast.map((person) => (
              <div key={person.id} className="w-24 shrink-0 text-center sm:w-28">
                <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full bg-ink-card sm:h-28 sm:w-28">
                  {person.profile_path && (
                    <Image
                      src={posterUrl(person.profile_path, "w185") ?? ""}
                      alt={person.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <p className="mt-2 truncate text-xs font-medium text-neutral-200">{person.name}</p>
                <p className="truncate text-xs text-neutral-500">{person.character}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-neutral-200">{value}</dd>
    </>
  );
}
