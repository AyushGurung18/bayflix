# Bayflix API worker

Cloudflare Worker backing the watchlist, watched history, AI semantic search,
and recommendations features. Runs on D1 (relational store for per-user
watchlist/watched), Vectorize (vector index acting as the searchable
"catalog"), and Workers AI (`@cf/baai/bge-base-en-v1.5`) for embeddings — no
external AI API key required, it's all billed to the same Cloudflare account.

This is a separate deployable from both the Next.js app and the existing
`cloudflare-worker/r2-video-worker.js` HLS worker — it's called directly from
the browser (Firebase ID token as bearer auth), not proxied through Next.js.

## How it stays functional with zero setup

Nothing needs to be pre-seeded. Whenever a signed-in user adds a title to
their watchlist or marks something watched, that title's overview gets
embedded and upserted into Vectorize on the spot — the vector index grows
organically from real usage, and semantic search / recommendations start
returning results as soon as there's *any* data in it. `POST /admin/index` is
an optional bulk-seed endpoint if you'd rather pre-populate a whole catalog
(e.g. TMDB's popular/trending lists) up front instead of waiting for that.

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

# 4. (Optional) protect the bulk-index endpoint
wrangler secret put ADMIN_KEY

# 5. Deploy
npm run deploy
```

Wrangler prints the deployed URL (`https://bayflix-api.<your-subdomain>.workers.dev`).
Put that in the Next.js app's `.env.local` / Vercel env vars as
`NEXT_PUBLIC_BAYFLIX_API_BASE_URL`. Until that variable is set, the app's
watchlist/watched/AI-search/recommendations UI stays quietly hidden instead
of erroring — see `lib/bayflix-api.js`.

## API

All endpoints return JSON and are CORS-open (`*`) since the only credential
involved — the Firebase ID token — is already client-held; there's no secret
API key on this worker to hide behind a server proxy the way TMDB/OMDb's are.

| Endpoint | Auth | Description |
|---|---|---|
| `GET /watchlist` | Firebase ID token | Current user's watchlist |
| `POST /watchlist` | Firebase ID token | Add/update an item (body: `tmdbId, mediaType, title, overview, posterPath, backdropPath, releaseDate, voteAverage`) |
| `DELETE /watchlist?tmdbId=&mediaType=` | Firebase ID token | Remove an item |
| `GET /watched`, `POST /watched`, `DELETE /watched` | Firebase ID token | Same shape, for watched history |
| `GET /search?q=` | none | Semantic search over the vector index |
| `GET /recommendations` | Firebase ID token | Titles similar to the user's watched history, excluding anything already watched/listed |
| `POST /admin/index` | `X-Admin-Key` header | Bulk-upsert `{ items: [...] }` into the vector index |

Auth is a real, verified Firebase ID token check (`src/verifyFirebaseToken.js`)
— RS256 signature verified against Google's published JWKS, plus
issuer/audience/expiry checks — not a decode-and-trust shortcut.
