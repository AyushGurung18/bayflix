-- D1 schema for Bayflix's profiles, watchlist, and watched history.
-- Vectorize is the "catalog" (one vector + metadata per title, keyed
-- "<mediaType>:<tmdbId>") — these tables only track the per-profile
-- relation, with enough denormalized fields (title/overview/poster) to
-- re-embed a title on the fly if it isn't in the vector index yet.

-- One Firebase account can have multiple profiles (Netflix-style) — each
-- profile has its own watchlist/watched/ratings and therefore its own
-- recommendation taste vector. user_id is kept on every row for ownership
-- checks and cascade deletes; profile_id is what data is actually scoped by.
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#e50914',
  avatar_emoji TEXT NOT NULL DEFAULT '🎬',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles (user_id, created_at);

CREATE TABLE IF NOT EXISTS watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date TEXT,
  vote_average REAL,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (profile_id, tmdb_id, media_type)
);

CREATE TABLE IF NOT EXISTS watched (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date TEXT,
  vote_average REAL,
  watched_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (profile_id, tmdb_id, media_type)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_profile ON watchlist (profile_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_watched_profile ON watched (profile_id, watched_at DESC);

-- Shared cache of OMDb (IMDb/Rotten Tomatoes/Metacritic) ratings, one row
-- per title, refreshed on a TTL (see src/omdb.ts) — this is what keeps OMDb
-- calls to roughly one per title ever instead of one per page view, so the
-- free-tier 1,000/day quota can't be exhausted by traffic or abuse. Crowd
-- data, not user data, so it's shared across every profile/account.
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

-- Private per-profile 1-5 star ratings — same denormalized shape as
-- watchlist/watched so a rated title can be embedded into Vectorize even if
-- it was never explicitly marked watched.
CREATE TABLE IF NOT EXISTS user_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
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
  UNIQUE (profile_id, tmdb_id, media_type)
);

CREATE INDEX IF NOT EXISTS idx_user_ratings_profile ON user_ratings (profile_id, rated_at DESC);

-- Account-level personal info (one row per Firebase login, not per
-- Netflix-style sub-profile) — dob/gender describe the account holder, not
-- a "who's watching" persona, so they live here rather than on `profiles`.
-- Name/email/photo already have a home on the Firebase User object itself.
CREATE TABLE IF NOT EXISTS accounts (
  user_id TEXT PRIMARY KEY,
  dob TEXT,
  gender TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
