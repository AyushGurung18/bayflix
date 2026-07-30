"use client";

async function fetchTmdb(path, params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/tmdb/${path}${query ? `?${query}` : ""}`);
  if (!res.ok) {
    throw new Error(`TMDB request failed: ${path} (${res.status})`);
  }
  return res.json();
}

export const IMAGE_BASE = "https://image.tmdb.org/t/p";
export const posterUrl = (path, size = "w342") =>
  path ? `${IMAGE_BASE}/${size}${path}` : null;
export const backdropUrl = (path, size = "original") =>
  path ? `${IMAGE_BASE}/${size}${path}` : null;

export function fetchPopularMovies(page = 1) {
  return fetchTmdb("movie/popular", { page });
}
export function fetchPopularSeries(page = 1) {
  return fetchTmdb("tv/popular", { page });
}
export function fetchTrendingMovies(page = 1) {
  return fetchTmdb("trending/movie/day", { page });
}
export function fetchTrendingSeries(page = 1) {
  return fetchTmdb("trending/tv/day", { page });
}
export function fetchUpcomingMovies(page = 1) {
  return fetchTmdb("movie/upcoming", { page });
}
export function fetchUpcomingSeries(page = 1) {
  return fetchTmdb("tv/on_the_air", { page });
}
export function fetchNowPlayingMovies(page = 1) {
  return fetchTmdb("movie/now_playing", { page });
}
export function fetchNowPlayingSeries(page = 1) {
  return fetchTmdb("tv/airing_today", { page });
}
export function fetchTopRatedMovies(page = 1) {
  return fetchTmdb("movie/top_rated", { page });
}
export function fetchTopRatedSeries(page = 1) {
  return fetchTmdb("tv/top_rated", { page });
}

export function fetchMovieVideos(id) {
  return fetchTmdb(`movie/${id}/videos`);
}
export function fetchTVVideos(id) {
  return fetchTmdb(`tv/${id}/videos`);
}

export function fetchMovieDetails(id) {
  return fetchTmdb(`movie/${id}`, { append_to_response: "videos,credits,recommendations" });
}
export function fetchTVDetails(id) {
  return fetchTmdb(`tv/${id}`, { append_to_response: "videos,credits,recommendations" });
}

export function searchMulti(query, page = 1) {
  return fetchTmdb("search/multi", { query, page, include_adult: false });
}

// Picks the best trailer for a title: prefer an official YouTube "Trailer",
// fall back to any YouTube "Teaser", then any YouTube video at all.
export function pickTrailer(videos) {
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

export const CATEGORIES = {
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
