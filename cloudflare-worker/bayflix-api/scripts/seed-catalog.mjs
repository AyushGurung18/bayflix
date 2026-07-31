#!/usr/bin/env node
// One-time (or occasional re-run) bulk seed for the Vectorize index.
//
// Lazy indexing (watchlist/watched/rate) only ever indexes what users
// actually touch — on a fresh deploy that's nothing, so semantic search has
// nothing to compare a query against. This pulls a broad slice of TMDB's
// catalog (including top_rated, so classics like The Dark Knight are in
// there, not just whatever's popular this week) and pushes it into
// POST /admin/index so search/recommendations work from day one.
//
// Usage:
//   TMDB_API_KEY=xxx WORKER_BASE_URL=https://bayflix-api.<you>.workers.dev ADMIN_KEY=xxx \
//     node scripts/seed-catalog.mjs
//
// Re-run it occasionally (e.g. monthly) to pick up new releases — it's
// idempotent, POST /admin/index upserts by (tmdbId, mediaType).

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || "https://api.themoviedb.org";
const WORKER_BASE_URL = process.env.WORKER_BASE_URL;
const ADMIN_KEY = process.env.ADMIN_KEY;

// mediaType -> [TMDB endpoint, pages to pull]. top_rated is what pulls in
// enduring classics; popular/trending skew toward what's current.
const SOURCES = [
  ["movie", "movie/top_rated", 10],
  ["movie", "movie/popular", 5],
  ["movie", "trending/movie/day", 3],
  ["movie", "movie/upcoming", 2],
  ["tv", "tv/top_rated", 10],
  ["tv", "tv/popular", 5],
  ["tv", "trending/tv/day", 3],
];

const BATCH_SIZE = 40;

function requireEnv() {
  const missing = [];
  if (!TMDB_API_KEY) missing.push("TMDB_API_KEY");
  if (!WORKER_BASE_URL) missing.push("WORKER_BASE_URL");
  if (!ADMIN_KEY) missing.push("ADMIN_KEY");
  if (missing.length) {
    console.error(`Missing required env var(s): ${missing.join(", ")}`);
    console.error("See the usage comment at the top of this script.");
    process.exit(1);
  }
}

async function fetchTmdbPage(endpoint, page) {
  const url = `${TMDB_BASE_URL}/3/${endpoint}?api_key=${TMDB_API_KEY}&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${endpoint} page ${page} failed: ${res.status}`);
  return res.json();
}

function toIndexItem(raw, mediaType) {
  return {
    tmdbId: raw.id,
    mediaType,
    title: raw.title || raw.name,
    overview: raw.overview || "",
    posterPath: raw.poster_path || null,
    backdropPath: raw.backdrop_path || null,
    releaseDate: raw.release_date || raw.first_air_date || null,
    voteAverage: raw.vote_average ?? null,
  };
}

async function postBatch(items) {
  const res = await fetch(`${WORKER_BASE_URL}/admin/index`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
    body: JSON.stringify({ items }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`/admin/index failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  requireEnv();

  const seen = new Map(); // "mediaType:tmdbId" -> item
  for (const [mediaType, endpoint, pages] of SOURCES) {
    for (let page = 1; page <= pages; page++) {
      process.stdout.write(`Fetching TMDB ${endpoint} page ${page}/${pages}... `);
      const data = await fetchTmdbPage(endpoint, page);
      for (const raw of data.results ?? []) {
        if (!raw.overview) continue; // nothing meaningful to embed
        const item = toIndexItem(raw, mediaType);
        seen.set(`${mediaType}:${item.tmdbId}`, item);
      }
      console.log(`${data.results?.length ?? 0} results (${seen.size} unique so far)`);
    }
  }

  const items = [...seen.values()];
  console.log(`\nIndexing ${items.length} titles into Vectorize, ${BATCH_SIZE} per request...`);

  let indexed = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    try {
      const result = await postBatch(batch);
      indexed += result.indexed ?? 0;
      console.log(`  batch ${i / BATCH_SIZE + 1}: indexed ${result.indexed}/${batch.length}`);
    } catch (err) {
      console.error(`  batch ${i / BATCH_SIZE + 1} failed:`, err.message);
    }
  }

  console.log(`\nDone. ${indexed}/${items.length} titles indexed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
