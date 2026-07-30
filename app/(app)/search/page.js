"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import MovieCard from "@/components/MovieCard";
import TrailerModal from "@/components/TrailerModal";
import { useTrailer } from "@/lib/use-trailer";
import { searchMulti } from "@/lib/tmdb";

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 350);
  const { trailer, openTrailer, closeTrailer } = useTrailer();

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) return;
    let cancelled = false;
    // Kicking off the loading indicator for the async fetch below belongs here, not in render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    searchMulti(trimmed)
      .then((data) => {
        if (cancelled) return;
        setResults((data.results ?? []).filter((r) => r.media_type === "movie" || r.media_type === "tv"));
      })
      .catch((err) => console.error(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const { movies, series } = useMemo(() => {
    if (!debouncedQuery.trim()) return { movies: [], series: [] };
    return {
      movies: results.filter((r) => r.media_type === "movie"),
      series: results.filter((r) => r.media_type === "tv"),
    };
  }, [results, debouncedQuery]);

  return (
    <div className="px-4 pb-16 pt-8 sm:px-10">
      <div className="relative mx-auto mb-10 max-w-xl">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for movies and TV shows"
          className="w-full rounded-full border border-neutral-700 bg-ink-card py-3.5 pl-12 pr-4 text-base text-white outline-none placeholder-neutral-500 focus:border-neutral-400"
        />
      </div>

      {loading && <p className="text-center text-neutral-500">Searching…</p>}

      {!loading && debouncedQuery.trim() && results.length === 0 && (
        <p className="text-center text-neutral-500">
          No matches found for &ldquo;{debouncedQuery}&rdquo;.
        </p>
      )}

      {movies.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Movies</h2>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {movies.map((item) => (
              <MovieCard key={item.id} item={item} mediaType="movie" onTrailer={openTrailer} />
            ))}
          </div>
        </section>
      )}

      {series.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">TV Series</h2>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {series.map((item) => (
              <MovieCard key={item.id} item={item} mediaType="tv" onTrailer={openTrailer} />
            ))}
          </div>
        </section>
      )}

      <TrailerModal videoKey={trailer?.key} title={trailer?.title} onClose={closeTrailer} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  );
}
