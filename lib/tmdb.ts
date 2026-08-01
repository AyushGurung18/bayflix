"use client";

import type {
  MediaType,
  TmdbDetails,
  TmdbItem,
  TmdbListResponse,
  TmdbPerson,
  TmdbSeasonDetails,
  TmdbVideo,
} from "./types";

async function fetchTmdb<T>(path: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();
  const res = await fetch(`/api/tmdb/${path}${query ? `?${query}` : ""}`);
  if (!res.ok) {
    throw new Error(`TMDB request failed: ${path} (${res.status})`);
  }
  return res.json();
}

export const IMAGE_BASE = "https://image.tmdb.org/t/p";
export const posterUrl = (path?: string | null, size = "w342") =>
  path ? `${IMAGE_BASE}/${size}${path}` : null;
export const backdropUrl = (path?: string | null, size = "original") =>
  path ? `${IMAGE_BASE}/${size}${path}` : null;

type ListResult = TmdbListResponse<TmdbItem>;

export function fetchPopularMovies(page = 1) {
  return fetchTmdb<ListResult>("movie/popular", { page });
}
export function fetchPopularSeries(page = 1) {
  return fetchTmdb<ListResult>("tv/popular", { page });
}
export function fetchTrendingMovies(page = 1) {
  return fetchTmdb<ListResult>("trending/movie/day", { page });
}
export function fetchTrendingSeries(page = 1) {
  return fetchTmdb<ListResult>("trending/tv/day", { page });
}
export function fetchUpcomingMovies(page = 1) {
  return fetchTmdb<ListResult>("movie/upcoming", { page });
}
export function fetchUpcomingSeries(page = 1) {
  return fetchTmdb<ListResult>("tv/on_the_air", { page });
}
export function fetchNowPlayingMovies(page = 1) {
  return fetchTmdb<ListResult>("movie/now_playing", { page });
}
export function fetchNowPlayingSeries(page = 1) {
  return fetchTmdb<ListResult>("tv/airing_today", { page });
}
export function fetchTopRatedMovies(page = 1) {
  return fetchTmdb<ListResult>("movie/top_rated", { page });
}
export function fetchTopRatedSeries(page = 1) {
  return fetchTmdb<ListResult>("tv/top_rated", { page });
}

export function fetchMovieVideos(id: number | string) {
  return fetchTmdb<{ results: TmdbVideo[] }>(`movie/${id}/videos`);
}
export function fetchTVVideos(id: number | string) {
  return fetchTmdb<{ results: TmdbVideo[] }>(`tv/${id}/videos`);
}

export function fetchMovieDetails(id: number | string) {
  return fetchTmdb<TmdbDetails>(`movie/${id}`, {
    append_to_response: "videos,credits,recommendations,watch/providers,reviews,release_dates",
  });
}
export function fetchTVDetails(id: number | string) {
  // TV objects don't carry a top-level imdb_id like movies do — external_ids
  // is the only way to get one, needed for the OMDb ratings lookup.
  return fetchTmdb<TmdbDetails>(`tv/${id}`, {
    append_to_response:
      "videos,credits,recommendations,external_ids,watch/providers,reviews,content_ratings",
  });
}

// Age certification (PG-13, R, TV-MA, ...) — prefers the US board since
// that's what most users recognize, falling back to whichever country TMDB
// actually has a non-empty rating for. Movies and TV expose this under
// completely different response shapes (release_dates vs content_ratings),
// hence the branch.
export function pickCertification(data: TmdbDetails, isTV: boolean): string | null {
  if (isTV) {
    const results = data.content_ratings?.results ?? [];
    const byRegion = (cc: string) => results.find((r) => r.iso_3166_1 === cc)?.rating;
    return byRegion("US") || results.find((r) => r.rating)?.rating || null;
  }
  const results = data.release_dates?.results ?? [];
  const certOf = (cc: string) =>
    results
      .find((r) => r.iso_3166_1 === cc)
      ?.release_dates.find((rd) => rd.certification)?.certification;
  return (
    certOf("US") ||
    results.flatMap((r) => r.release_dates).find((rd) => rd.certification)?.certification ||
    null
  );
}

export function fetchSeasonDetails(tvId: number | string, seasonNumber: number) {
  return fetchTmdb<TmdbSeasonDetails>(`tv/${tvId}/season/${seasonNumber}`);
}

export function searchMulti(query: string, page = 1) {
  return fetchTmdb<ListResult>("search/multi", { query, page, include_adult: false });
}

export function fetchPersonDetails(id: number | string) {
  return fetchTmdb<TmdbPerson>(`person/${id}`, { append_to_response: "combined_credits" });
}

// Picks the best trailer for a title: prefer an official YouTube "Trailer",
// fall back to any YouTube "Teaser", then any YouTube video at all.
export function pickTrailer(videos?: { results: TmdbVideo[] }): TmdbVideo | null {
  const list = videos?.results ?? [];
  const youtube = list.filter((v) => v.site === "YouTube");
  return (
    youtube.find((v) => v.type === "Trailer" && v.official) ||
    youtube.find((v) => v.type === "Trailer") ||
    youtube.find((v) => v.type === "Teaser") ||
    youtube[0] ||
    null
  );
}

interface Category {
  label: string;
  movies: (page?: number) => Promise<ListResult>;
  series: (page?: number) => Promise<ListResult>;
}

export const CATEGORIES: Record<string, Category> = {
  popular: {
    label: "Popular",
    movies: fetchPopularMovies,
    series: fetchPopularSeries,
  },
  trending: {
    label: "Trending",
    movies: fetchTrendingMovies,
    series: fetchTrendingSeries,
  },
  "top-rated": {
    label: "Top Rated",
    movies: fetchTopRatedMovies,
    series: fetchTopRatedSeries,
  },
  upcoming: {
    label: "Upcoming",
    movies: fetchUpcomingMovies,
    series: fetchUpcomingSeries,
  },
  "now-playing": {
    label: "Now Playing",
    movies: fetchNowPlayingMovies,
    series: fetchNowPlayingSeries,
  },
};

export type { MediaType };
