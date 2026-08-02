import { verifyFirebaseToken, type FirebaseTokenPayload } from "./verifyFirebaseToken";
import { embedText, indexTitle, matchToCardItem, buildTasteVector, vectorId, type TasteRow } from "./embeddings";
import { getCachedRatings } from "./omdb";
import type { Env, IndexableItem, MediaType } from "./env";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Profile-Id",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

class AuthError extends Error {}

async function requireUserPayload(request: Request, env: Env): Promise<FirebaseTokenPayload> {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) throw new AuthError("Missing Authorization header");
  try {
    return await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
  } catch (err) {
    throw new AuthError((err as Error).message);
  }
}

async function requireUser(request: Request, env: Env): Promise<string> {
  return (await requireUserPayload(request, env)).sub;
}

// Every account gets an implicit default profile whose id is its own uid —
// old (pre-multi-profile) rows already carry that id via the migration, and
// a brand new account never has to explicitly create one to start using
// watchlist/watched before ever touching /profiles. defaultName comes from
// the account holder's own Firebase display name (see handleProfiles) so a
// brand-new account isn't stuck with a generic "Profile 1".
async function ensureDefaultProfile(env: Env, uid: string, defaultName?: string): Promise<void> {
  const existing = await env.DB.prepare("SELECT id FROM profiles WHERE user_id = ? LIMIT 1")
    .bind(uid)
    .first();
  if (existing) return;
  const name = (defaultName || "").trim().slice(0, 40) || "My Profile";
  await env.DB.prepare(
    "INSERT INTO profiles (id, user_id, name, avatar_color, avatar_emoji) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(uid, uid, name, "#e50914", "🎬")
    .run();
}

// Resolves which profile a request is acting as. X-Profile-Id lets the
// frontend scope watchlist/watched/ratings/recommendations to whichever
// profile is active; omitting it (or passing the account's own uid) falls
// back to the default profile so older clients keep working unmodified.
async function requireProfile(request: Request, env: Env, uid: string): Promise<string> {
  const header = request.headers.get("X-Profile-Id");
  if (!header || header === uid) {
    await ensureDefaultProfile(env, uid);
    return uid;
  }
  const owned = await env.DB.prepare("SELECT 1 FROM profiles WHERE id = ? AND user_id = ?")
    .bind(header, uid)
    .first();
  if (!owned) throw new AuthError("Profile not found");
  return header;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeItem(body: Record<string, unknown>): IndexableItem {
  return {
    tmdbId: Number(body.tmdbId),
    mediaType: body.mediaType === "tv" ? "tv" : "movie",
    title: String(body.title || "").slice(0, 300),
    overview: body.overview ? String(body.overview).slice(0, 2000) : null,
    posterPath: (body.posterPath as string) || null,
    backdropPath: (body.backdropPath as string) || null,
    releaseDate: (body.releaseDate as string) || null,
    voteAverage: typeof body.voteAverage === "number" ? body.voteAverage : null,
  };
}

type RelationTable = "watchlist" | "watched";

async function upsertRelation(
  env: Env,
  table: RelationTable,
  uid: string,
  profileId: string,
  item: IndexableItem
) {
  await env.DB.prepare(
    `INSERT INTO ${table}
       (user_id, profile_id, tmdb_id, media_type, title, overview, poster_path, backdrop_path, release_date, vote_average)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (profile_id, tmdb_id, media_type) DO UPDATE SET title = excluded.title`
  )
    .bind(
      uid,
      profileId,
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

async function deleteRelation(
  env: Env,
  table: RelationTable,
  profileId: string,
  tmdbId: number,
  mediaType: MediaType
) {
  await env.DB.prepare(`DELETE FROM ${table} WHERE profile_id = ? AND tmdb_id = ? AND media_type = ?`)
    .bind(profileId, tmdbId, mediaType)
    .run();
}

interface RelationRow {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  vote_average: number | null;
  at: string;
}

function rowToCardItem(row: RelationRow) {
  return {
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
  };
}

async function listRelation(env: Env, table: RelationTable, profileId: string) {
  const orderCol = table === "watched" ? "watched_at" : "added_at";
  const { results } = await env.DB.prepare(
    `SELECT tmdb_id, media_type, title, overview, poster_path, backdrop_path, release_date, vote_average, ${orderCol} AS at
     FROM ${table} WHERE profile_id = ? ORDER BY ${orderCol} DESC`
  )
    .bind(profileId)
    .all<RelationRow>();
  return results.map(rowToCardItem);
}

async function handleRelationRoute(request: Request, env: Env, table: RelationTable): Promise<Response> {
  const uid = await requireUser(request, env);
  const profileId = await requireProfile(request, env, uid);

  if (request.method === "GET") {
    return json({ results: await listRelation(env, table, profileId) });
  }
  if (request.method === "POST") {
    const item = normalizeItem(await readBody(request));
    if (!item.tmdbId || !item.title) return json({ error: "tmdbId and title are required" }, 400);
    await upsertRelation(env, table, uid, profileId, item);
    return json({ ok: true });
  }
  if (request.method === "DELETE") {
    const url = new URL(request.url);
    const body = await readBody(request);
    const tmdbId = Number(url.searchParams.get("tmdbId") ?? body.tmdbId);
    const mediaType: MediaType = (url.searchParams.get("mediaType") ?? body.mediaType) === "tv" ? "tv" : "movie";
    if (!tmdbId) return json({ error: "tmdbId is required" }, 400);
    await deleteRelation(env, table, profileId, tmdbId, mediaType);
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
}

// Public — shared crowd ratings, D1-cached (see src/omdb.ts) so OMDb only
// ever gets called once per title regardless of view count.
async function handleRatingsLookup(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const tmdbId = Number(url.searchParams.get("tmdbId"));
  const mediaType: MediaType = url.searchParams.get("mediaType") === "tv" ? "tv" : "movie";
  const imdbId = url.searchParams.get("imdbId") || null;
  const title = url.searchParams.get("title") || null;
  const year = url.searchParams.get("year") || null;

  if (!tmdbId || (!imdbId && !title)) {
    return json({ error: "tmdbId and (imdbId or title) are required" }, 400);
  }

  const result = await getCachedRatings(env, { tmdbId, mediaType, imdbId, title, year });
  return json(result);
}

interface RatingRow extends RelationRow {
  stars: number;
  rated_at: string;
}

async function handleMyRatings(request: Request, env: Env): Promise<Response> {
  const uid = await requireUser(request, env);
  const profileId = await requireProfile(request, env, uid);

  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT tmdb_id, media_type, title, overview, poster_path, backdrop_path, release_date, vote_average, stars, rated_at
       FROM user_ratings WHERE profile_id = ? ORDER BY rated_at DESC`
    )
      .bind(profileId)
      .all<RatingRow>();
    return json({
      results: results.map((row) => ({
        ...rowToCardItem({ ...row, at: row.rated_at }),
        stars: row.stars,
        rated_at: row.rated_at,
      })),
    });
  }

  if (request.method === "POST") {
    const body = await readBody(request);
    const item = normalizeItem(body);
    const stars = Number(body.stars);
    if (!item.tmdbId || !item.title) return json({ error: "tmdbId and title are required" }, 400);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return json({ error: "stars must be an integer 1-5" }, 400);
    }

    await env.DB.prepare(
      `INSERT INTO user_ratings
         (user_id, profile_id, tmdb_id, media_type, title, overview, poster_path, backdrop_path, release_date, vote_average, stars)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (profile_id, tmdb_id, media_type)
       DO UPDATE SET stars = excluded.stars, rated_at = datetime('now')`
    )
      .bind(
        uid,
        profileId,
        item.tmdbId,
        item.mediaType,
        item.title,
        item.overview,
        item.posterPath,
        item.backdropPath,
        item.releaseDate,
        item.voteAverage,
        stars
      )
      .run();

    // Same lazy-indexing as watchlist/watched — a rated title feeds the
    // recommendation engine even if it was never marked watched.
    await indexTitle(env, item).catch((err) => console.error("indexTitle failed", err));

    return json({ ok: true });
  }

  if (request.method === "DELETE") {
    const url = new URL(request.url);
    const body = await readBody(request);
    const tmdbId = Number(url.searchParams.get("tmdbId") ?? body.tmdbId);
    const mediaType: MediaType = (url.searchParams.get("mediaType") ?? body.mediaType) === "tv" ? "tv" : "movie";
    if (!tmdbId) return json({ error: "tmdbId is required" }, 400);
    await env.DB.prepare("DELETE FROM user_ratings WHERE profile_id = ? AND tmdb_id = ? AND media_type = ?")
      .bind(profileId, tmdbId, mediaType)
      .run();
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
}

interface ProfileRow {
  id: string;
  name: string;
  avatar_color: string;
  avatar_emoji: string;
}

const MAX_PROFILES = 5;

async function handleProfiles(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") {
    const payload = await requireUserPayload(request, env);
    const uid = payload.sub;
    const fallbackName =
      (typeof payload.name === "string" && payload.name.trim()) ||
      (typeof payload.email === "string" ? payload.email.split("@")[0] : "") ||
      "My Profile";
    await ensureDefaultProfile(env, uid, fallbackName);
    const { results } = await env.DB.prepare(
      "SELECT id, name, avatar_color, avatar_emoji FROM profiles WHERE user_id = ? ORDER BY created_at ASC"
    )
      .bind(uid)
      .all<ProfileRow>();
    return json({ results });
  }

  if (request.method === "POST") {
    const uid = await requireUser(request, env);
    const body = await readBody(request);
    const name = String(body.name || "").trim().slice(0, 40);
    if (!name) return json({ error: "name is required" }, 400);

    const { c } = (await env.DB.prepare("SELECT COUNT(*) AS c FROM profiles WHERE user_id = ?")
      .bind(uid)
      .first<{ c: number }>()) ?? { c: 0 };
    if (c >= MAX_PROFILES) return json({ error: `Maximum of ${MAX_PROFILES} profiles` }, 400);

    const id = crypto.randomUUID();
    const avatarColor = typeof body.avatarColor === "string" ? body.avatarColor.slice(0, 16) : "#e50914";
    const avatarEmoji = typeof body.avatarEmoji === "string" ? body.avatarEmoji.slice(0, 8) : "🎬";

    await env.DB.prepare(
      "INSERT INTO profiles (id, user_id, name, avatar_color, avatar_emoji) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(id, uid, name, avatarColor, avatarEmoji)
      .run();

    return json({ id, name, avatar_color: avatarColor, avatar_emoji: avatarEmoji });
  }

  if (request.method === "DELETE") {
    const uid = await requireUser(request, env);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "id is required" }, 400);

    const { c } = (await env.DB.prepare("SELECT COUNT(*) AS c FROM profiles WHERE user_id = ?")
      .bind(uid)
      .first<{ c: number }>()) ?? { c: 0 };
    if (c <= 1) return json({ error: "Can't delete your only profile" }, 400);

    await env.DB.prepare("DELETE FROM profiles WHERE id = ? AND user_id = ?").bind(id, uid).run();
    await Promise.all(
      (["watchlist", "watched", "user_ratings"] as const).map((table) =>
        env.DB.prepare(`DELETE FROM ${table} WHERE profile_id = ? AND user_id = ?`).bind(id, uid).run()
      )
    );
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
}

const GENDER_OPTIONS = new Set(["Female", "Male", "Non-binary", "Prefer not to say"]);

// Account-level personal info — dob/gender, one row per Firebase login. Name,
// email, and photo already live on the Firebase User object itself.
async function handleAccount(request: Request, env: Env): Promise<Response> {
  const uid = await requireUser(request, env);

  if (request.method === "GET") {
    const row = await env.DB.prepare("SELECT dob, gender FROM accounts WHERE user_id = ?")
      .bind(uid)
      .first<{ dob: string | null; gender: string | null }>();
    return json({ dob: row?.dob ?? null, gender: row?.gender ?? null });
  }

  if (request.method === "PUT") {
    const body = await readBody(request);

    let dob: string | null = null;
    if (body.dob != null) {
      if (typeof body.dob !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.dob)) {
        return json({ error: "dob must be an ISO date string (YYYY-MM-DD)" }, 400);
      }
      dob = body.dob;
    }

    let gender: string | null = null;
    if (body.gender != null) {
      if (typeof body.gender !== "string" || !GENDER_OPTIONS.has(body.gender)) {
        return json({ error: "Invalid gender value" }, 400);
      }
      gender = body.gender;
    }

    await env.DB.prepare(
      `INSERT INTO accounts (user_id, dob, gender, updated_at) VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT (user_id) DO UPDATE SET dob = excluded.dob, gender = excluded.gender, updated_at = excluded.updated_at`
    )
      .bind(uid, dob, gender)
      .run();

    return json({ dob, gender });
  }

  return json({ error: "Method not allowed" }, 405);
}

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function handleAvatarUpload(request: Request, env: Env): Promise<Response> {
  const uid = await requireUser(request, env);

  const contentType = request.headers.get("Content-Type") || "";
  if (!AVATAR_CONTENT_TYPES.has(contentType)) {
    return json({ error: "Only JPEG, PNG, or WebP images are supported" }, 400);
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0) return json({ error: "Empty file" }, 400);
  if (bytes.byteLength > AVATAR_MAX_BYTES) return json({ error: "Image must be under 2MB" }, 400);

  await env.AVATARS.put(`avatars/${uid}`, bytes, { httpMetadata: { contentType } });
  return json({ ok: true });
}

// Public and unauthenticated by design — a plain <img>/next/image src can't
// carry a bearer token, and a profile photo is no more sensitive than a
// Google-account photoURL, which is already public the same way. Mirrors
// r2-video-worker.js's plain .get(key) → stream-back pattern.
async function handleAvatarServe(env: Env, uid: string): Promise<Response> {
  const object = await env.AVATARS.get(`avatars/${uid}`);
  if (!object) return json({ error: "Not found" }, 404);
  const headers = new Headers(CORS_HEADERS);
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=300");
  return new Response(object.body, { headers });
}

async function handleSearch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return json({ results: [] });

  const vector = await embedText(env, q);
  const { matches } = await env.VECTORIZE_INDEX.query(vector, { topK: 24, returnMetadata: true });
  return json({ results: matches.map((m) => matchToCardItem(m.metadata as never)) });
}

async function handleRecommendations(request: Request, env: Env): Promise<Response> {
  const uid = await requireUser(request, env);
  const profileId = await requireProfile(request, env, uid);

  const [{ results: watched }, { results: ratings }] = await Promise.all([
    env.DB.prepare(
      "SELECT tmdb_id, media_type, title, overview FROM watched WHERE profile_id = ? ORDER BY watched_at DESC LIMIT 15"
    )
      .bind(profileId)
      .all<TasteRow>(),
    env.DB.prepare(
      "SELECT tmdb_id, media_type, title, overview, stars FROM user_ratings WHERE profile_id = ?"
    )
      .bind(profileId)
      .all<TasteRow>(),
  ]);

  if (watched.length === 0 && ratings.length === 0) return json({ results: [] });

  const taste = await buildTasteVector(env, watched, ratings);
  if (!taste) return json({ results: [] });

  const { results: watchlist } = await env.DB.prepare(
    "SELECT tmdb_id, media_type FROM watchlist WHERE profile_id = ?"
  )
    .bind(profileId)
    .all<{ tmdb_id: number; media_type: MediaType }>();

  const seen = new Set([
    ...watched.map((r) => vectorId(r.media_type, r.tmdb_id)),
    ...watchlist.map((r) => vectorId(r.media_type, r.tmdb_id)),
    ...ratings.map((r) => vectorId(r.media_type, r.tmdb_id)),
  ]);

  const { matches } = await env.VECTORIZE_INDEX.query(taste, { topK: 30, returnMetadata: true });
  const results = matches
    .filter((m) => !seen.has(m.id))
    .slice(0, 20)
    .map((m) => matchToCardItem(m.metadata as never));

  return json({ results });
}

async function handleAdminIndex(request: Request, env: Env): Promise<Response> {
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
    const item = normalizeItem(raw as Record<string, unknown>);
    if (!item.tmdbId || !item.title) continue;
    await indexTitle(env, item);
    indexed++;
  }

  return json({ ok: true, indexed });
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/health") return json({ ok: true });
      if (url.pathname === "/profiles") return await handleProfiles(request, env);
      if (url.pathname === "/account") return await handleAccount(request, env);
      if (url.pathname === "/account/avatar" && request.method === "POST")
        return await handleAvatarUpload(request, env);
      if (url.pathname.startsWith("/avatar/") && request.method === "GET")
        return await handleAvatarServe(env, url.pathname.slice("/avatar/".length));
      if (url.pathname === "/watchlist") return await handleRelationRoute(request, env, "watchlist");
      if (url.pathname === "/watched") return await handleRelationRoute(request, env, "watched");
      if (url.pathname === "/ratings" && request.method === "GET")
        return await handleRatingsLookup(request, env);
      if (url.pathname === "/ratings/mine") return await handleMyRatings(request, env);
      if (url.pathname === "/search" && request.method === "GET") return await handleSearch(request, env);
      if (url.pathname === "/recommendations" && request.method === "GET")
        return await handleRecommendations(request, env);
      if (url.pathname === "/admin/index" && request.method === "POST")
        return await handleAdminIndex(request, env);

      return json({ error: "Not found" }, 404);
    } catch (err) {
      if (err instanceof AuthError) return json({ error: "Unauthorized", detail: err.message }, 401);
      console.error(err);
      return json({ error: "Internal error", detail: (err as Error).message }, 500);
    }
  },
};

export default worker;
