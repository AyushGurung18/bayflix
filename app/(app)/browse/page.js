"use client";

import { useEffect, useState } from "react";
import Hero from "@/components/Hero";
import MovieRow from "@/components/MovieRow";
import TrailerModal from "@/components/TrailerModal";
import { SkeletonBrowse } from "@/components/Skeletons";
import { useTrailer } from "@/lib/use-trailer";
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

export default function BrowsePage() {
  const [rows, setRows] = useState(null);
  const [heroMovie, setHeroMovie] = useState(null);
  const { trailer, openTrailer, openTrailerDirect, closeTrailer } = useTrailer();

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
        if (!cancelled) setRows({});
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
        <MovieRow
          title="Trending Now"
          items={rows.trending}
          mediaType="movie"
          exploreHref="/category/trending"
          onTrailer={openTrailer}
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
