"use client";

import { useEffect, useState } from "react";
import Hero from "@/components/Hero";
import MovieRow from "@/components/MovieRow";
import LazyMovieRow from "@/components/LazyMovieRow";
import TrailerModal from "@/components/TrailerModal";
import { SkeletonHero, SkeletonRow } from "@/components/Skeletons";
import { useTrailer } from "@/lib/use-trailer";
import { useWatchStatus } from "@/lib/watch-status-context";
import { useProfiles } from "@/lib/profile-context";
import { getRecommendations } from "@/lib/bayflix-api";
import {
  fetchPopularMovies,
  fetchTrendingMovies,
  fetchUpcomingMovies,
  fetchNowPlayingMovies,
  fetchTopRatedMovies,
  fetchPopularSeries,
  fetchTrendingSeries,
  fetchMovieDetails,
} from "@/lib/tmdb";
import type { TmdbDetails, TmdbItem } from "@/lib/types";

export default function BrowsePage() {
  // Trending and popular are fetched eagerly — they're what's visible
  // without scrolling, so they drive the initial paint. Everything below
  // the fold (LazyMovieRow rows) only fetches once it's about to scroll
  // into view, instead of every category racing on mount and blocking a
  // single full-page skeleton.
  const [trending, setTrending] = useState<TmdbItem[] | null>(null);
  const [popular, setPopular] = useState<TmdbItem[] | null>(null);
  const [heroMovie, setHeroMovie] = useState<TmdbDetails | null>(null);
  const [recommendations, setRecommendations] = useState<TmdbItem[]>([]);
  const { trailer, openTrailer, openTrailerDirect, closeTrailer } = useTrailer();
  const { configured, watchlist, watched, ratings } = useWatchStatus();
  const { activeProfile } = useProfiles();
  const watchedRows = [...watched].reverse();

  useEffect(() => {
    if (!configured || !activeProfile || (watched.length === 0 && ratings.length === 0)) return;
    let cancelled = false;
    getRecommendations(activeProfile.id).then((results) => !cancelled && setRecommendations(results));
    return () => {
      cancelled = true;
    };
    // Deliberately depends on watched.length/ratings.length (not the arrays
    // themselves) so this only re-fires when a title is actually added, not
    // every render.
  }, [configured, activeProfile, watched.length, ratings.length]);

  useEffect(() => {
    let cancelled = false;
    fetchTrendingMovies()
      .then((data) => {
        if (cancelled) return;
        const results = data.results ?? [];
        setTrending(results);
        const featured = results[0];
        return featured ? fetchMovieDetails(featured.id) : null;
      })
      .then((details) => !cancelled && details && setHeroMovie(details))
      .catch((err) => console.error("Failed to load trending", err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPopularMovies()
      .then((data) => !cancelled && setPopular(data.results ?? []))
      .catch((err) => console.error("Failed to load popular", err));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pb-16">
      {heroMovie ? <Hero item={heroMovie} mediaType="movie" onTrailer={openTrailerDirect} /> : <SkeletonHero />}

      <div className="relative z-10 -mt-10 sm:-mt-16">
        {configured && recommendations.length > 0 && (
          <MovieRow title="Recommended For You" items={recommendations} onTrailer={openTrailer} />
        )}
        {configured && watchlist.length > 0 && (
          <MovieRow
            title="My List"
            items={watchlist}
            exploreHref="/watchlist"
            onTrailer={openTrailer}
          />
        )}
        {configured && watchedRows.length > 0 && (
          <MovieRow title="Watched" items={watchedRows} onTrailer={openTrailer} />
        )}

        {trending ? (
          <MovieRow
            title="Top 10 in Movies Today"
            items={trending}
            mediaType="movie"
            exploreHref="/category/trending"
            onTrailer={openTrailer}
            showRank
          />
        ) : (
          <SkeletonRow />
        )}

        {popular ? (
          <MovieRow
            title="Popular Movies"
            items={popular}
            mediaType="movie"
            exploreHref="/category/popular"
            onTrailer={openTrailer}
          />
        ) : (
          <SkeletonRow />
        )}

        <LazyMovieRow
          title="Popular TV Shows"
          fetcher={fetchPopularSeries}
          mediaType="tv"
          exploreHref="/category/popular"
          onTrailer={openTrailer}
        />
        <LazyMovieRow
          title="Now Playing"
          fetcher={fetchNowPlayingMovies}
          mediaType="movie"
          exploreHref="/category/now-playing"
          onTrailer={openTrailer}
        />
        <LazyMovieRow
          title="Upcoming"
          fetcher={fetchUpcomingMovies}
          mediaType="movie"
          exploreHref="/category/upcoming"
          onTrailer={openTrailer}
        />
        <LazyMovieRow
          title="Top Rated"
          fetcher={fetchTopRatedMovies}
          mediaType="movie"
          exploreHref="/category/top-rated"
          onTrailer={openTrailer}
        />
        <LazyMovieRow
          title="Trending Series"
          fetcher={fetchTrendingSeries}
          mediaType="tv"
          exploreHref="/category/trending"
          onTrailer={openTrailer}
        />
      </div>

      <TrailerModal videoKey={trailer?.key} title={trailer?.title} onClose={closeTrailer} />
    </div>
  );
}
