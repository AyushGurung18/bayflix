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
