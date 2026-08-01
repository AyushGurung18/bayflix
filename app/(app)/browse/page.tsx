"use client";

import { useEffect, useState } from "react";
import Hero from "@/components/Hero";
import MovieRow from "@/components/MovieRow";
import TrailerModal from "@/components/TrailerModal";
import { SkeletonBrowse } from "@/components/Skeletons";
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

interface BrowseRows {
  popular: TmdbItem[];
  trending: TmdbItem[];
  upcoming: TmdbItem[];
  nowPlaying: TmdbItem[];
  topRated: TmdbItem[];
  popularSeries: TmdbItem[];
  trendingSeries: TmdbItem[];
}

const EMPTY_ROWS: BrowseRows = {
  popular: [],
  trending: [],
  upcoming: [],
  nowPlaying: [],
  topRated: [],
  popularSeries: [],
  trendingSeries: [],
};

export default function BrowsePage() {
  const [rows, setRows] = useState<BrowseRows | null>(null);
  const [heroMovie, setHeroMovie] = useState<TmdbDetails | null>(null);
  const [recommendations, setRecommendations] = useState<TmdbItem[]>([]);
  const { trailer, openTrailer, openTrailerDirect, closeTrailer } = useTrailer();
  const { configured, watchlist, watched } = useWatchStatus();
  const { activeProfile } = useProfiles();
  const watchedRows = [...watched].reverse();

  useEffect(() => {
    if (!configured || !activeProfile || watched.length === 0) return;
    let cancelled = false;
    getRecommendations(activeProfile.id).then((results) => !cancelled && setRecommendations(results));
    return () => {
      cancelled = true;
    };
    // Deliberately depends on watched.length (not the watched array itself)
    // so this only re-fires when a title is actually added, not every render.
  }, [configured, activeProfile, watched.length]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [popular, trending, upcoming, nowPlaying, topRated, popularSeries, trendingSeries] =
          await Promise.all([
            fetchPopularMovies(),
            fetchTrendingMovies(),
            fetchUpcomingMovies(),
            fetchNowPlayingMovies(),
            fetchTopRatedMovies(),
            fetchPopularSeries(),
            fetchTrendingSeries(),
          ]);

        if (cancelled) return;

        setRows({
          popular: popular.results ?? [],
          trending: trending.results ?? [],
          upcoming: upcoming.results ?? [],
          nowPlaying: nowPlaying.results ?? [],
          topRated: topRated.results ?? [],
          popularSeries: popularSeries.results ?? [],
          trendingSeries: trendingSeries.results ?? [],
        });

        const featured = (trending.results ?? popular.results ?? [])[0];
        if (featured) {
          const details = await fetchMovieDetails(featured.id);
          if (!cancelled) setHeroMovie(details);
        }
      } catch (error) {
        console.error("Failed to load dashboard", error);
        if (!cancelled) setRows(EMPTY_ROWS);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!rows) return <SkeletonBrowse />;

  return (
    <div className="pb-16">
      <Hero item={heroMovie} mediaType="movie" onTrailer={openTrailerDirect} />

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
        <MovieRow
          title="Top 10 in Movies Today"
          items={rows.trending}
          mediaType="movie"
          exploreHref="/category/trending"
          onTrailer={openTrailer}
          showRank
        />
        <MovieRow
          title="Popular Movies"
          items={rows.popular}
          mediaType="movie"
          exploreHref="/category/popular"
          onTrailer={openTrailer}
        />
        <MovieRow
          title="Popular TV Shows"
          items={rows.popularSeries}
          mediaType="tv"
          exploreHref="/category/popular"
          onTrailer={openTrailer}
        />
        <MovieRow
          title="Now Playing"
          items={rows.nowPlaying}
          mediaType="movie"
          exploreHref="/category/now-playing"
          onTrailer={openTrailer}
        />
        <MovieRow
          title="Upcoming"
          items={rows.upcoming}
          mediaType="movie"
          exploreHref="/category/upcoming"
          onTrailer={openTrailer}
        />
        <MovieRow
          title="Top Rated"
          items={rows.topRated}
          mediaType="movie"
          exploreHref="/category/top-rated"
          onTrailer={openTrailer}
        />
        <MovieRow
          title="Trending Series"
          items={rows.trendingSeries}
          mediaType="tv"
          exploreHref="/category/trending"
          onTrailer={openTrailer}
        />
      </div>

      <TrailerModal videoKey={trailer?.key} title={trailer?.title} onClose={closeTrailer} />
    </div>
  );
}
