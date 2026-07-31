# Bayflix API worker

Cloudflare Worker backing the watchlist, watched history, star ratings, AI
semantic search, and recommendations features. Runs on D1 (relational store
for per-user watchlist/watched/ratings, plus a shared OMDb ratings cache),
Vectorize (vector index acting as the searchable "catalog"), and Workers AI
(`@cf/baai/bge-base-en-v1.5`) for embeddings — no external AI API key
required, it's all billed to the same Cloudflare account.

This is a separate deployable from both the Next.js app and the existing
`cloudflare-worker/r2-video-worker.js` HLS worker — it's called directly from
the browser (Firebase ID token as bearer auth), not proxied through Next.js.

## Seeding the vector index

Whenever a signed-in user adds a title to their watchlist, marks something
watched, or rates it, that title's overview gets embedded and upserted into
Vectorize on the spot — the index keeps growing from real usage after that.

But on a fresh deploy it starts **empty**, and semantic search can only ever
return titles that are actually indexed — there's no fallback. Run the seed
script once after deploying so search/recommendations have something real to
work with immediately, instead of only whatever you personally happen to
watchlist:

```bash
TMDB_API_KEY=your_tmdb_key \
WORKER_BASE_URL=https://bayflix-api.<your-subdomain>.workers.dev \
ADMIN_KEY=the_key_from_step_4_below \
npm run seed
```

It pulls TMDB's top-rated + popular + trending + upcoming movies and TV
shows (a few hundred titles, including older classics via `top_rated` — not
just whatever's trending this week) and pushes them into `POST /admin/index`
in batches. It's idempotent (upserts by tmdb id), so it's safe to re-run
occasionally to pick up new releases.

## Setup

```bash
cd cloudflare-worker/bayflix-api
npm install
wrangler login

# 1. Create the D1 database, then paste the printed database_id into wrangler.toml
wrangler d1 create bayflix-db
npm run db:migrate

# 2. Create the Vectorize index (dimensions must match the embedding model — 768 for bge-base-en-v1.5)
wrangler vectorize create bayflix-index --dimensions=768 --metric=cosine

# 3. Set FIREBASE_PROJECT_ID in wrangler.toml to the same project as
#    NEXT_PUBLIC_FIREBASE_PROJECT_ID in the Next.js app's .env.local

# 4. Protects POST /admin/index (used by the seed script below) — required,
#    not optional, since that endpoint can write into your D1/Vectorize
wrangler secret put ADMIN_KEY

# 5. OMDb ratings (IMDb/Rotten Tomatoes/Metacritic) — free key at
#    omdbapi.com/apikey.aspx. Results are cached in D1 (ratings_cache,
#    30-day TTL), so this stays well under the free 1,000-request/day quota
#    no matter how much traffic the app gets — OMDb is called once per
#    title, not once per page view.
wrangler secret put OMDB_API_KEY

# 6. Deploy
npm run deploy

# 7. Seed the vector index — see "Seeding the vector index" below. Without
#    this, semantic search returns nothing until users organically build it up.
```

Wrangler prints the deployed URL (`https://bayflix-api.<your-subdomain>.workers.dev`).
Put that in the Next.js app's `.env.local` / Vercel env vars as
`NEXT_PUBLIC_BAYFLIX_API_BASE_URL`. Until that variable is set, the app's
watchlist/watched/AI-search/recommendations UI stays quietly hidden instead
of erroring — see `lib/bayflix-api.js`.

## API

All endpoints return JSON and are CORS-open (`*`). The watchlist/watched/
ratings/search/recommendations endpoints don't need a server-side secret
hidden from the client — the Firebase ID token is already client-held. The
one exception is `GET /ratings`, which does hold a secret (`OMDB_API_KEY`)
server-side; the client never sees it, and D1 caching keeps OMDb call volume
low regardless of how the endpoint gets hit.

| Endpoint | Auth | Description |
|---|---|---|
| `GET /watchlist` | Firebase ID token | Current user's watchlist |
| `POST /watchlist` | Firebase ID token | Add/update an item (body: `tmdbId, mediaType, title, overview, posterPath, backdropPath, releaseDate, voteAverage`) |
| `DELETE /watchlist?tmdbId=&mediaType=` | Firebase ID token | Remove an item |
| `GET /watched`, `POST /watched`, `DELETE /watched` | Firebase ID token | Same shape, for watched history |
| `GET /ratings?tmdbId=&mediaType=&imdbId=&title=&year=` | none | D1-cached IMDb/Rotten Tomatoes/Metacritic ratings (imdbId preferred; title+year as fallback) |
| `GET /ratings/mine` | Firebase ID token | Current user's 1-5 star ratings |
| `POST /ratings/mine` | Firebase ID token | Upsert a rating (body: same shape as watchlist, plus `stars` 1-5) |
| `DELETE /ratings/mine?tmdbId=&mediaType=` | Firebase ID token | Remove a rating |
| `GET /search?q=` | none | Semantic search over the vector index |
| `GET /recommendations` | Firebase ID token | Titles similar to the user's watched history and ratings (weighted — 5-star counts full, 1-star counts 0.2x), excluding anything already watched/listed/rated |
| `POST /admin/index` | `X-Admin-Key` header | Bulk-upsert `{ items: [...] }` into the vector index |

Auth is a real, verified Firebase ID token check (`src/verifyFirebaseToken.js`)
— RS256 signature verified against Google's published JWKS, plus
issuer/audience/expiry checks — not a decode-and-trust shortcut.
