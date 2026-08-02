export interface Env {
  DB: D1Database;
  VECTORIZE_INDEX: VectorizeIndex;
  AI: Ai;
  AVATARS: R2Bucket;
  FIREBASE_PROJECT_ID: string;
  ADMIN_KEY?: string;
  OMDB_API_KEY?: string;
}

export type MediaType = "movie" | "tv";

/** Normalized shape used across watchlist/watched/ratings/indexing — the
 * request-body fields common to every endpoint that touches a title. */
export interface IndexableItem {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
}
