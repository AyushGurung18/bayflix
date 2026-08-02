import type { Env, MediaType } from "./env";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — ratings rarely move
// A row can come back with an IMDb rating but no Rotten Tomatoes/Metacritic
// simply because those aggregators hadn't caught up to OMDb yet at fetch
// time (common right after a release) — the full 30-day TTL would otherwise
// leave a new title looking incomplete for a month even after OMDb gets the
// missing scores. Incomplete rows get rechecked much sooner instead.
const INCOMPLETE_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

interface RatingsCacheRow {
  tmdb_id: number;
  media_type: MediaType;
  imdb_id: string | null;
  imdb_rating: number | null;
  imdb_votes: string | null;
  rotten_tomatoes: string | null;
  metacritic: number | null;
  found: number;
  fetched_at: string;
}

interface OmdbFields {
  imdbId: string | null;
  imdbRating: number | null;
  imdbVotes: string | null;
  rottenTomatoes: string | null;
  metacritic: number | null;
}

export type RatingsResult =
  | { configured: false }
  | { found: false }
  | ({ found: true } & OmdbFields);

interface RatingsLookupArgs {
  tmdbId: number;
  mediaType: MediaType;
  imdbId?: string | null;
  title?: string | null;
  year?: string | null;
}

function isFresh(row: RatingsCacheRow): boolean {
  const age = Date.now() - new Date(`${row.fetched_at}Z`).getTime();
  const isComplete = !row.found || Boolean(row.rotten_tomatoes || row.metacritic);
  return age < (isComplete ? CACHE_TTL_MS : INCOMPLETE_TTL_MS);
}

function rowToResult(row: RatingsCacheRow): RatingsResult {
  if (!row.found) return { found: false };
  return {
    found: true,
    imdbId: row.imdb_id,
    imdbRating: row.imdb_rating,
    imdbVotes: row.imdb_votes,
    rottenTomatoes: row.rotten_tomatoes,
    metacritic: row.metacritic,
  };
}

async function fetchFromOmdb(
  env: Env,
  { imdbId, title, year, mediaType }: Pick<RatingsLookupArgs, "imdbId" | "title" | "year" | "mediaType">
): Promise<OmdbFields | null> {
  const params = new URLSearchParams({ apikey: env.OMDB_API_KEY! });
  if (imdbId) params.set("i", imdbId);
  else {
    params.set("t", title!);
    if (year) params.set("y", year);
    // Without this, a title/year search for a remake can match the wrong
    // entry when a movie and TV series (or two unrelated titles) share both
    // a name and release year — this only matters on the title/year
    // fallback path; an imdbId lookup is already unambiguous.
    params.set("type", mediaType === "tv" ? "series" : "movie");
  }

  const res = await fetch(`https://www.omdbapi.com/?${params.toString()}`);
  const data = (await res.json()) as {
    Response: string;
    Error?: string;
    Ratings?: { Source: string; Value: string }[];
    imdbID?: string;
    imdbRating?: string;
    imdbVotes?: string;
    Metascore?: string;
  };
  if (data.Response === "False") {
    // Surfaces *why* OMDb rejected the lookup (bad/unactivated key vs. a
    // genuine title miss) without ever logging the key itself.
    console.error("OMDb lookup returned no result", { title, year, imdbId, reason: data.Error });
    return null;
  }

  const ratings = Object.fromEntries(
    (data.Ratings ?? []).map((r: { Source: string; Value: string }) => [r.Source, r.Value])
  );
  return {
    imdbId: data.imdbID || null,
    imdbRating: data.imdbRating !== "N/A" ? Number(data.imdbRating) : null,
    imdbVotes: data.imdbVotes && data.imdbVotes !== "N/A" ? data.imdbVotes : null,
    rottenTomatoes: ratings["Rotten Tomatoes"] ?? null,
    metacritic: data.Metascore !== "N/A" ? Number(data.Metascore) : null,
  };
}

/**
 * D1-cached OMDb lookup, keyed by (tmdbId, mediaType). Falls through to a
 * live OMDb call only on a cache miss or a stale (>30 day) row, and caches
 * "not found" too so an unmatched title doesn't get re-queried forever.
 */
export async function getCachedRatings(
  env: Env,
  { tmdbId, mediaType, imdbId, title, year }: RatingsLookupArgs
): Promise<RatingsResult> {
  const cached = await env.DB.prepare(
    "SELECT * FROM ratings_cache WHERE tmdb_id = ? AND media_type = ?"
  )
    .bind(tmdbId, mediaType)
    .first<RatingsCacheRow>();

  if (cached && isFresh(cached)) {
    return rowToResult(cached);
  }

  if (!env.OMDB_API_KEY) {
    return cached ? rowToResult(cached) : { configured: false };
  }

  let fresh: OmdbFields | null;
  try {
    fresh = await fetchFromOmdb(env, { imdbId, title, year, mediaType });
  } catch (err) {
    console.error("OMDb fetch failed", err);
    return cached ? rowToResult(cached) : { found: false };
  }

  await env.DB.prepare(
    `INSERT INTO ratings_cache
       (tmdb_id, media_type, imdb_id, imdb_rating, imdb_votes, rotten_tomatoes, metacritic, found, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT (tmdb_id, media_type) DO UPDATE SET
       imdb_id = excluded.imdb_id, imdb_rating = excluded.imdb_rating, imdb_votes = excluded.imdb_votes,
       rotten_tomatoes = excluded.rotten_tomatoes, metacritic = excluded.metacritic,
       found = excluded.found, fetched_at = excluded.fetched_at`
  )
    .bind(
      tmdbId,
      mediaType,
      fresh?.imdbId ?? null,
      fresh?.imdbRating ?? null,
      fresh?.imdbVotes ?? null,
      fresh?.rottenTomatoes ?? null,
      fresh?.metacritic ?? null,
      fresh ? 1 : 0
    )
    .run();

  return fresh ? { found: true, ...fresh } : { found: false };
}
