-- D1 schema for Bayflix's watchlist/watched history.
-- Vectorize is the "catalog" (one vector + metadata per title, keyed
-- "<mediaType>:<tmdbId>") — these tables only track the per-user relation,
-- with enough denormalized fields (title/overview/poster) to re-embed a
-- title on the fly if it isn't in the vector index yet.

CREATE TABLE IF NOT EXISTS watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date TEXT,
  vote_average REAL,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, tmdb_id, media_type)
);

CREATE TABLE IF NOT EXISTS watched (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date TEXT,
  vote_average REAL,
  watched_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, tmdb_id, media_type)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist (user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_watched_user ON watched (user_id, watched_at DESC);

-- Shared cache of OMDb (IMDb/Rotten Tomatoes/Metacritic) ratings, one row
-- per title, refreshed on a TTL (see src/omdb.js) — this is what keeps OMDb
-- calls to roughly one per title ever instead of one per page view, so the
-- free-tier 1,000/day quota can't be exhausted by traffic or abuse.
CREATE TABLE IF NOT EXISTS ratings_cache (
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  imdb_id TEXT,
  imdb_rating REAL,
  imdb_votes TEXT,
  rotten_tomatoes TEXT,
  metacritic INTEGER,
  found INTEGER NOT NULL DEFAULT 1, -- OMDb misses are cached too, so they aren't re-queried forever
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tmdb_id, media_type)
);

-- Private per-user 1-5 star ratings — same denormalized shape as
-- watchlist/watched so a rated title can be embedded into Vectorize even if
-- it was never explicitly marked watched.
CREATE TABLE IF NOT EXISTS user_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date TEXT,
  vote_average REAL,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  rated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, tmdb_id, media_type)
);

CREATE INDEX IF NOT EXISTS idx_user_ratings_user ON user_ratings (user_id, rated_at DESC);
