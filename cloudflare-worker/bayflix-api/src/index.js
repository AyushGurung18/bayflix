import { verifyFirebaseToken } from "./verifyFirebaseToken.js";
import { embedText, indexTitle, matchToCardItem, tasteVectorFromWatched, vectorId } from "./embeddings.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

async function requireUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) throw new AuthError("Missing Authorization header");
  try {
    const payload = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
    return payload.sub;
  } catch (err) {
    throw new AuthError(err.message);
  }
}

class AuthError extends Error {}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function normalizeItem(body) {
  return {
    tmdbId: Number(body.tmdbId),
    mediaType: body.mediaType === "tv" ? "tv" : "movie",
    title: String(body.title || "").slice(0, 300),
    overview: body.overview ? String(body.overview).slice(0, 2000) : null,
    posterPath: body.posterPath || null,
    backdropPath: body.backdropPath || null,
    releaseDate: body.releaseDate || null,
    voteAverage: typeof body.voteAverage === "number" ? body.voteAverage : null,
  };
}

async function upsertRelation(env, table, uid, item) {
  await env.DB.prepare(
    `INSERT INTO ${table}
       (user_id, tmdb_id, media_type, title, overview, poster_path, backdrop_path, release_date, vote_average)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, tmdb_id, media_type) DO UPDATE SET title = excluded.title`
  )
    .bind(
      uid,
      item.tmdbId,
      item.mediaType,
      item.title,
      item.overview,
      item.posterPath,
      item.backdropPath,
      item.releaseDate,
      item.voteAverage
    )
    .run();

  // Lazily grow the vector index with whatever titles users actually
  // interact with — no separate backfill job is required for the app to
  // start returning real search/recommendation results.
  await indexTitle(env, item).catch((err) => console.error("indexTitle failed", err));
}

async function deleteRelation(env, table, uid, tmdbId, mediaType) {
  await env.DB.prepare(`DELETE FROM ${table} WHERE user_id = ? AND tmdb_id = ? AND media_type = ?`)
    .bind(uid, tmdbId, mediaType)
    .run();
}

async function listRelation(env, table, uid) {
  const orderCol = table === "watched" ? "watched_at" : "added_at";
  const { results } = await env.DB.prepare(
    `SELECT tmdb_id, media_type, title, overview, poster_path, backdrop_path, release_date, vote_average, ${orderCol} AS at
     FROM ${table} WHERE user_id = ? ORDER BY ${orderCol} DESC`
  )
    .bind(uid)
    .all();
  return results.map((row) => ({
    id: row.tmdb_id,
    media_type: row.media_type,
    title: row.media_type === "movie" ? row.title : undefined,
    name: row.media_type === "tv" ? row.title : undefined,
    overview: row.overview,
    poster_path: row.poster_path,
    backdrop_path: row.backdrop_path,
    release_date: row.media_type === "movie" ? row.release_date : undefined,
    first_air_date: row.media_type === "tv" ? row.release_date : undefined,
    vote_average: row.vote_average,
    added_at: row.at,
  }));
}

async function handleRelationRoute(request, env, table) {
  const uid = await requireUser(request, env);

  if (request.method === "GET") {
    return json({ results: await listRelation(env, table, uid) });
  }
  if (request.method === "POST") {
    const item = normalizeItem(await readBody(request));
    if (!item.tmdbId || !item.title) return json({ error: "tmdbId and title are required" }, 400);
    await upsertRelation(env, table, uid, item);
    return json({ ok: true });
  }
  if (request.method === "DELETE") {
    const url = new URL(request.url);
    const body = await readBody(request);
    const tmdbId = Number(url.searchParams.get("tmdbId") ?? body.tmdbId);
    const mediaType = (url.searchParams.get("mediaType") ?? body.mediaType) === "tv" ? "tv" : "movie";
    if (!tmdbId) return json({ error: "tmdbId is required" }, 400);
    await deleteRelation(env, table, uid, tmdbId, mediaType);
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
}

async function handleSearch(request, env) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return json({ results: [] });

  const vector = await embedText(env, q);
  const { matches } = await env.VECTORIZE_INDEX.query(vector, { topK: 24, returnMetadata: true });
  return json({ results: matches.map((m) => matchToCardItem(m.metadata)) });
}

async function handleRecommendations(request, env) {
  const uid = await requireUser(request, env);

  const { results: watched } = await env.DB.prepare(
    "SELECT tmdb_id, media_type, title, overview FROM watched WHERE user_id = ? ORDER BY watched_at DESC LIMIT 8"
  )
    .bind(uid)
    .all();

  if (watched.length === 0) return json({ results: [] });

  const taste = await tasteVectorFromWatched(env, watched);
  if (!taste) return json({ results: [] });

  const { results: watchlist } = await env.DB.prepare(
    "SELECT tmdb_id, media_type FROM watchlist WHERE user_id = ?"
  )
    .bind(uid)
    .all();

  const seen = new Set([
    ...watched.map((r) => vectorId(r.media_type, r.tmdb_id)),
    ...watchlist.map((r) => vectorId(r.media_type, r.tmdb_id)),
  ]);

  const { matches } = await env.VECTORIZE_INDEX.query(taste, { topK: 30, returnMetadata: true });
  const results = matches
    .filter((m) => !seen.has(m.id))
    .slice(0, 20)
    .map((m) => matchToCardItem(m.metadata));

  return json({ results });
}

async function handleAdminIndex(request, env) {
  const adminKey = request.headers.get("X-Admin-Key");
  if (!env.ADMIN_KEY || adminKey !== env.ADMIN_KEY) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { items } = await readBody(request);
  if (!Array.isArray(items) || items.length === 0) {
    return json({ error: "items array is required" }, 400);
  }

  let indexed = 0;
  for (const raw of items) {
    const item = normalizeItem(raw);
    if (!item.tmdbId || !item.title) continue;
    await indexTitle(env, item);
    indexed++;
  }

  return json({ ok: true, indexed });
}

const worker = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/health") return json({ ok: true });
      if (url.pathname === "/watchlist") return await handleRelationRoute(request, env, "watchlist");
      if (url.pathname === "/watched") return await handleRelationRoute(request, env, "watched");
      if (url.pathname === "/search" && request.method === "GET") return await handleSearch(request, env);
      if (url.pathname === "/recommendations" && request.method === "GET")
        return await handleRecommendations(request, env);
      if (url.pathname === "/admin/index" && request.method === "POST")
        return await handleAdminIndex(request, env);

      return json({ error: "Not found" }, 404);
    } catch (err) {
      if (err instanceof AuthError) return json({ error: "Unauthorized", detail: err.message }, 401);
      console.error(err);
      return json({ error: "Internal error", detail: err.message }, 500);
    }
  },
};

export default worker;
