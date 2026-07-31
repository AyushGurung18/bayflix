"use client";

const IMDB_YELLOW = "#F5C518";
const TMDB_GREEN = "#01D277";

export default function RatingsBadges({ ratings, tmdbScore }) {
  const tmdbBadge = tmdbScore > 0 && <Badge label="TMDB" value={`${tmdbScore.toFixed(1)}/10`} accent={TMDB_GREEN} />;

  if (!ratings) {
    return tmdbBadge ? <div className="flex flex-wrap items-center gap-2">{tmdbBadge}</div> : null;
  }

  if (ratings.configured === false) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {tmdbBadge}
        <span className="opacity-60">
          <Badge label="IMDb" value="—" hint="OMDB_API_KEY not set on the worker yet" />
        </span>
        <span className="opacity-60">
          <Badge label="RT" value="—" hint="OMDB_API_KEY not set on the worker yet" />
        </span>
      </div>
    );
  }

  const { imdbRating, rottenTomatoes, metacritic } = ratings;
  if (!tmdbBadge && !imdbRating && !rottenTomatoes && !metacritic) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tmdbBadge}
      {imdbRating && <Badge label="IMDb" value={`${imdbRating}/10`} accent={IMDB_YELLOW} />}
      {rottenTomatoes && <Badge label="RT" value={rottenTomatoes} accent="#FA320A" />}
      {metacritic && <Badge label="Metacritic" value={`${metacritic}/100`} accent="#54B848" />}
    </div>
  );
}

function Badge({ label, value, accent, hint }) {
  return (
    <span
      title={hint}
      className="flex items-center gap-1.5 rounded border border-neutral-700 bg-ink-card px-2.5 py-1 text-xs font-semibold text-neutral-200"
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent || "#666" }} />
      {label} <span className="text-neutral-400">{value}</span>
    </span>
  );
}
