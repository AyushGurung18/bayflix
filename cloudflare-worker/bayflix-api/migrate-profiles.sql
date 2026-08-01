-- One-off migration: adds multi-profile support to an already-deployed D1
-- database. schema.sql alone won't touch existing tables (CREATE TABLE IF
-- NOT EXISTS is a no-op once they exist) — this rebuilds watchlist/watched/
-- user_ratings with a profile_id column and backfills one default profile
-- per existing user so none of their data goes orphaned.
--
-- Run once: wrangler d1 execute bayflix-db --remote --file=./migrate-profiles.sql
-- Safe to re-run — every step is idempotent or guarded.

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#e50914',
  avatar_emoji TEXT NOT NULL DEFAULT '🎬',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles (user_id, created_at);

-- Backfill: one default profile per existing user, id = user_id so old rows
-- (which only know user_id) attach to it unambiguously.
INSERT OR IGNORE INTO profiles (id, user_id, name, avatar_color, avatar_emoji)
SELECT user_id, user_id, 'Profile 1', '#e50914', '🎬' FROM (
  SELECT user_id FROM watchlist
  UNION SELECT user_id FROM watched
  UNION SELECT user_id FROM user_ratings
);

CREATE TABLE IF NOT EXISTS watchlist_new (
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
INSERT INTO watchlist_new (id, user_id, profile_id, tmdb_id, media_type, title, overview, poster_path, backdrop_path, release_date, vote_average, added_at)
SELECT id, user_id, user_id, tmdb_id, media_type, title, overview, poster_path, backdrop_path, release_date, vote_average, added_at FROM watchlist;
DROP TABLE watchlist;
ALTER TABLE watchlist_new RENAME TO watchlist;
CREATE INDEX IF NOT EXISTS idx_watchlist_profile ON watchlist (profile_id, added_at DESC);

CREATE TABLE IF NOT EXISTS watched_new (
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
INSERT INTO watched_new (id, user_id, profile_id, tmdb_id, media_type, title, overview, poster_path, backdrop_path, release_date, vote_average, watched_at)
SELECT id, user_id, user_id, tmdb_id, media_type, title, overview, poster_path, backdrop_path, release_date, vote_average, watched_at FROM watched;
DROP TABLE watched;
ALTER TABLE watched_new RENAME TO watched;
CREATE INDEX IF NOT EXISTS idx_watched_profile ON watched (profile_id, watched_at DESC);

CREATE TABLE IF NOT EXISTS user_ratings_new (
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
INSERT INTO user_ratings_new (id, user_id, profile_id, tmdb_id, media_type, title, overview, poster_path, backdrop_path, release_date, vote_average, stars, rated_at)
SELECT id, user_id, user_id, tmdb_id, media_type, title, overview, poster_path, backdrop_path, release_date, vote_average, stars, rated_at FROM user_ratings;
DROP TABLE user_ratings;
ALTER TABLE user_ratings_new RENAME TO user_ratings;
CREATE INDEX IF NOT EXISTS idx_user_ratings_profile ON user_ratings (profile_id, rated_at DESC);
