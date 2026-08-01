export type MediaType = "movie" | "tv";

/** Shape shared by TMDB list results, watchlist/watched/rating rows, and
 * Vectorize search/recommendation matches — components render all of these
 * through the same MovieCard, so they need a common (if loose) shape. */
export interface TmdbItem {
  id: number;
  media_type?: MediaType;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  added_at?: string;
  stars?: number;
  rated_at?: string;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbVideo {
  id: string;
  key: string;
  site: string;
  type: string;
  official?: boolean;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
}

export interface TmdbDetails extends TmdbItem {
  runtime?: number;
  budget?: number;
  revenue?: number;
  spoken_languages?: { name: string }[];
  status?: string;
  genres?: TmdbGenre[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  imdb_id?: string | null;
  external_ids?: { imdb_id?: string | null };
  videos?: { results: TmdbVideo[] };
  credits?: { cast: TmdbCastMember[] };
  recommendations?: { results: TmdbItem[] };
  success?: boolean;
}

export interface TmdbListResponse<T = TmdbItem> {
  page?: number;
  results: T[];
  total_pages?: number;
  total_results?: number;
}

export interface TmdbCombinedCreditItem extends TmdbItem {
  media_type: MediaType;
  character?: string;
  popularity?: number;
}

export interface TmdbPerson {
  id: number;
  name: string;
  biography?: string;
  birthday?: string | null;
  deathday?: string | null;
  place_of_birth?: string | null;
  profile_path?: string | null;
  known_for_department?: string;
  combined_credits?: { cast: TmdbCombinedCreditItem[] };
  success?: boolean;
}

/** Result shape of lib/bayflix-api's getRatings() / the worker's GET /ratings. */
export interface RatingsResult {
  configured?: boolean;
  found?: boolean;
  imdbId?: string | null;
  imdbRating?: number | null;
  imdbVotes?: string | null;
  rottenTomatoes?: string | null;
  metacritic?: number | null;
}
