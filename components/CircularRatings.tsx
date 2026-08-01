"use client";

import type { RatingsResult } from "@/lib/types";

// Hue/saturation per source; lightness is derived from the score itself so a
// stronger rating reads as a richer, darker color and a weak one washes out
// pale — the ring's color intensity IS the signal, not just its fill amount.
const TMDB_HS: [number, number] = [154, 70];
const IMDB_HS: [number, number] = [46, 92];
const RT_HS: [number, number] = [4, 88];
const META_HS: [number, number] = [100, 55];

function scoreColor([hue, sat]: [number, number], pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const lightness = 74 - (clamped / 100) * 36; // 74% (weak) down to 38% (strong)
  return `hsl(${hue} ${sat}% ${lightness}%)`;
}

interface CircularRatingsProps {
  ratings: RatingsResult | null | undefined;
  tmdbScore?: number;
}

export default function CircularRatings({ ratings, tmdbScore }: CircularRatingsProps) {
  const tmdbRing = tmdbScore && tmdbScore > 0 && (
    <RatingRing label="TMDB" percentage={tmdbScore * 10} hs={TMDB_HS} />
  );

  if (!ratings) {
    return tmdbRing ? <div className="flex flex-wrap items-center gap-6">{tmdbRing}</div> : null;
  }

  if (ratings.configured === false) {
    return (
      <div className="flex flex-wrap items-center gap-6">
        {tmdbRing}
        <RatingRing label="IMDb" percentage={null} hs={IMDB_HS} hint="OMDB_API_KEY not set on the worker yet" />
        <RatingRing label="RT" percentage={null} hs={RT_HS} hint="OMDB_API_KEY not set on the worker yet" />
      </div>
    );
  }

  const { imdbRating, rottenTomatoes, metacritic } = ratings;
  if (!tmdbRing && !imdbRating && !rottenTomatoes && !metacritic) return null;

  return (
    <div className="flex flex-wrap items-center gap-6">
      {tmdbRing}
      {imdbRating && <RatingRing label="IMDb" percentage={imdbRating * 10} hs={IMDB_HS} display={`${imdbRating}`} />}
      {rottenTomatoes && (
        <RatingRing label="RT" percentage={parseInt(rottenTomatoes, 10)} hs={RT_HS} />
      )}
      {metacritic && <RatingRing label="Metacritic" percentage={metacritic} hs={META_HS} />}
    </div>
  );
}

interface RatingRingProps {
  label: string;
  percentage: number | null;
  hs: [number, number];
  hint?: string;
  /** Override what's printed in the center (e.g. "8.1" instead of "81%"). */
  display?: string;
}

function RatingRing({ label, percentage, hs, hint, display }: RatingRingProps) {
  const size = 68;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = percentage == null ? 0 : Math.max(0, Math.min(100, percentage));
  const offset = circumference * (1 - pct / 100);
  const color = percentage == null ? "#525252" : scoreColor(hs, pct);

  return (
    <div title={hint} className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-white/10"
          />
          {percentage != null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                transition: "stroke-dashoffset 0.8s ease-out",
                filter: `drop-shadow(0 0 6px ${color}90)`,
              }}
            />
          )}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">
          {percentage == null ? "—" : (display ?? `${Math.round(pct)}%`)}
        </span>
      </div>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
        style={{ color, backgroundColor: `${color}1f` }}
      >
        {label}
      </span>
    </div>
  );
}
