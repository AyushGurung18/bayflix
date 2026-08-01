"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Star, Clock, Tv } from "lucide-react";
import { backdropUrl, fetchSeasonDetails } from "@/lib/tmdb";
import { BLUR_DATA_URL } from "@/lib/image-utils";
import type { TmdbEpisode, TmdbSeason } from "@/lib/types";

function formatRuntime(minutes?: number | null) {
  if (!minutes) return null;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

interface SeasonsEpisodesProps {
  tvId: number;
  seasons?: TmdbSeason[];
}

// Rendered with key={tvId} by MediaDetail so a full remount (fresh lazy
// initial state) happens when navigating between different shows, instead
// of an effect syncing activeSeason back to season 1 after the fact.
export default function SeasonsEpisodes({ tvId, seasons }: SeasonsEpisodesProps) {
  const realSeasons = (seasons ?? []).filter((s) => s.season_number > 0 && s.episode_count > 0);
  const [activeSeason, setActiveSeason] = useState<number | null>(
    () => realSeasons[realSeasons.length - 1]?.season_number ?? null
  );
  const [episodes, setEpisodes] = useState<TmdbEpisode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeSeason == null) return;
    let cancelled = false;
    // Signals fetch-in-flight for the skeleton below — genuinely can't be
    // derived from render-time values, it IS the response to activeSeason
    // changing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchSeasonDetails(tvId, activeSeason)
      .then((data) => !cancelled && setEpisodes(data.episodes ?? []))
      .catch(() => !cancelled && setEpisodes([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tvId, activeSeason]);

  if (realSeasons.length === 0) return null;

  return (
    <div className="mt-10 px-4 sm:px-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Tv size={18} className="text-brand" /> Episodes
        </h2>
        <select
          value={activeSeason ?? ""}
          onChange={(e) => setActiveSeason(Number(e.target.value))}
          className="rounded border border-white/15 bg-ink-card px-3 py-1.5 text-sm text-neutral-200 outline-none focus:border-white/40"
        >
          {realSeasons.map((s) => (
            <option key={s.season_number} value={s.season_number}>
              {s.name || `Season ${s.season_number}`}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-ink-card sm:h-32" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {episodes.map((ep) => (
            <div
              key={ep.id}
              className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/20 hover:bg-white/[0.06] sm:p-4"
            >
              <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-ink-card sm:h-24 sm:w-40">
                {ep.still_path ? (
                  <Image
                    src={backdropUrl(ep.still_path, "w300") ?? ""}
                    alt={ep.name}
                    fill
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-600">
                    <Tv size={20} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {ep.episode_number}. {ep.name}
                  </span>
                  {ep.vote_average > 0 && (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-green-400">
                      <Star size={11} fill="currentColor" /> {ep.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="mb-1.5 flex items-center gap-3 text-xs text-neutral-500">
                  {ep.air_date && <span>{ep.air_date}</span>}
                  {formatRuntime(ep.runtime) && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {formatRuntime(ep.runtime)}
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-xs text-neutral-400 sm:text-sm">
                  {ep.overview || "No overview available."}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
