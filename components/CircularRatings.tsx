"use client";

import type { RatingsResult } from "@/lib/types";

const IMDB_YELLOW = "#F5C518";
const TMDB_GREEN = "#01D277";
const RT_FRESH = "#FA320A";
const META_GREEN = "#54B848";

interface CircularRatingsProps {
  ratings: RatingsResult | null | undefined;
  tmdbScore?: number;
}

export default function CircularRatings({ ratings, tmdbScore }: CircularRatingsProps) {
  const tmdbRing = tmdbScore && tmdbScore > 0 && (
    <RatingRing label="TMDB" percentage={tmdbScore * 10} accent={TMDB_GREEN} />
  );

  if (!ratings) {
    return tmdbRing ? <div className="flex flex-wrap items-center gap-5">{tmdbRing}</div> : null;
  }

  if (ratings.configured === false) {
    return (
      <div className="flex flex-wrap items-center gap-5">
        {tmdbRing}
        <RatingRing label="IMDb" percentage={null} accent={IMDB_YELLOW} hint="OMDB_API_KEY not set on the worker yet" />
        <RatingRing label="RT" percentage={null} accent={RT_FRESH} hint="OMDB_API_KEY not set on the worker yet" />
      </div>
    );
  }

  const { imdbRating, rottenTomatoes, metacritic } = ratings;
  if (!tmdbRing && !imdbRating && !rottenTomatoes && !metacritic) return null;

  return (
    <div className="flex flex-wrap items-center gap-5">
      {tmdbRing}
      {imdbRating && <RatingRing label="IMDb" percentage={imdbRating * 10} accent={IMDB_YELLOW} display={`${imdbRating}`} />}
      {rottenTomatoes && (
        <RatingRing label="RT" percentage={parseInt(rottenTomatoes, 10)} accent={RT_FRESH} />
      )}
      {metacritic && <RatingRing label="Metacritic" percentage={metacritic} accent={META_GREEN} />}
    </div>
  );
}

interface RatingRingProps {
  label: string;
  percentage: number | null;
  accent: string;
  hint?: string;
  /** Override what's printed in the center (e.g. "8.1" instead of "81%"). */
  display?: string;
}

function RatingRing({ label, percentage, accent, hint, display }: RatingRingProps) {
  const size = 52;
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = percentage == null ? 0 : Math.max(0, Math.min(100, percentage));
  const offset = circumference * (1 - pct / 100);

  return (
    <div title={hint} className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-neutral-700"
          />
          {percentage != null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={accent}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
            />
          )}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
          {percentage == null ? "—" : (display ?? `${Math.round(pct)}%`)}
        </span>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{label}</span>
    </div>
  );
}
