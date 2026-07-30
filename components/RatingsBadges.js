"use client";

const IMDB_YELLOW = "#F5C518";

export default function RatingsBadges({ ratings }) {
  if (!ratings) return null;

  if (ratings.configured === false) {
    return (
      <div className="flex flex-wrap items-center gap-2 opacity-60">
        <Badge label="IMDb" value="—" hint="Add OMDB_API_KEY to enable" />
        <Badge label="RT" value="—" hint="Add OMDB_API_KEY to enable" />
        <Badge label="Metacritic" value="—" hint="Add OMDB_API_KEY to enable" />
      </div>
    );
  }

  const { imdbRating, rottenTomatoes, metacritic } = ratings;
  if (!imdbRating && !rottenTomatoes && !metacritic) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {imdbRating && (
        <Badge label="IMDb" value={`${imdbRating}/10`} accent={IMDB_YELLOW} />
      )}
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
