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

/** A profile under one Firebase account (Netflix-style "who's watching") —
 * each has its own watchlist/watched/ratings and recommendation taste. */
export interface Profile {
  id: string;
  name: string;
  avatar_color: string;
  avatar_emoji: string;
}

export interface TmdbReview {
  id: string;
  author: string;
  author_details?: {
    rating?: number | null;
    avatar_path?: string | null;
    username?: string;
  };
  content: string;
  created_at: string;
  url?: string;
}

export interface TmdbSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  poster_path: string | null;
  air_date: string | null;
  overview?: string;
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  vote_average: number;
  runtime?: number | null;
}

export interface TmdbSeasonDetails {
  id: number;
  season_number: number;
  name: string;
  overview?: string;
  episodes: TmdbEpisode[];
}

export interface TmdbReleaseDateEntry {
  certification: string;
  type: number;
}

export interface TmdbReleaseDatesCountry {
  iso_3166_1: string;
  release_dates: TmdbReleaseDateEntry[];
}

export interface TmdbContentRatingsCountry {
  iso_3166_1: string;
  rating: string;
}

export interface WatchProviderEntry {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority?: number;
}

export interface WatchProviderCountry {
  link?: string;
  flatrate?: WatchProviderEntry[];
  rent?: WatchProviderEntry[];
  buy?: WatchProviderEntry[];
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
  "watch/providers"?: { results: Record<string, WatchProviderCountry> };
  reviews?: { results: TmdbReview[] };
  seasons?: TmdbSeason[];
  release_dates?: { results: TmdbReleaseDatesCountry[] };
  content_ratings?: { results: TmdbContentRatingsCountry[] };
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
