"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search as SearchIcon, Sparkles } from "lucide-react";
import MovieCard from "@/components/MovieCard";
import TrailerModal from "@/components/TrailerModal";
import { SkeletonGrid } from "@/components/Skeletons";
import { useTrailer } from "@/lib/use-trailer";
import { searchMulti } from "@/lib/tmdb";
import { isBayflixApiConfigured, semanticSearch } from "@/lib/bayflix-api";
import type { TmdbItem } from "@/lib/types";

function useDebouncedValue<T>(value: T, delay: number): T {
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
  const [results, setResults] = useState<TmdbItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 350);
  const { trailer, openTrailer, closeTrailer } = useTrailer();
  const aiAvailable = isBayflixApiConfigured();

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) return;
    let cancelled = false;
    // Kicking off the loading indicator for the async fetch below belongs here, not in render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    const request: Promise<TmdbItem[]> =
      aiMode && aiAvailable
        ? semanticSearch(trimmed)
        : searchMulti(trimmed).then(
            (data) => (data.results ?? []).filter((r) => r.media_type === "movie" || r.media_type === "tv")
          );

    request
      .then((list) => !cancelled && setResults(list))
      .catch((err) => console.error(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, aiMode, aiAvailable]);

  const { movies, series } = useMemo(() => {
    if (!debouncedQuery.trim()) return { movies: [] as TmdbItem[], series: [] as TmdbItem[] };
    return {
      movies: results.filter((r) => r.media_type === "movie"),
      series: results.filter((r) => r.media_type === "tv"),
    };
  }, [results, debouncedQuery]);

  return (
    <div className="px-4 pb-16 pt-8 sm:px-10">
      <div className="mx-auto mb-4 max-w-xl">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={aiMode ? "Describe what you're in the mood for…" : "Search for movies and TV shows"}
            className="w-full rounded-full border border-neutral-700 bg-ink-card py-3.5 pl-12 pr-4 text-base text-white outline-none placeholder-neutral-500 focus:border-neutral-400"
          />
        </div>

        {aiAvailable && (
          <button
            onClick={() => setAiMode((v) => !v)}
            className={`mt-3 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              aiMode
                ? "border-brand bg-brand/10 text-brand"
                : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
            }`}
          >
            <Sparkles size={13} /> AI Search {aiMode ? "on" : "off"}
          </button>
        )}
      </div>
      {aiMode && aiAvailable && (
        <p className="mx-auto mb-6 max-w-xl text-center text-xs text-neutral-500">
          Semantic search — try something like &ldquo;time travel movies with a twist ending&rdquo;
          instead of an exact title.
        </p>
      )}

      {loading && <SkeletonGrid count={14} />}

      {!loading && debouncedQuery.trim() && results.length === 0 && (
        <p className="text-center text-neutral-500">
          No matches found for &ldquo;{debouncedQuery}&rdquo;.
        </p>
      )}

      {!loading && movies.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-10"
        >
          <h2 className="mb-4 text-xl font-semibold">Movies</h2>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {movies.map((item) => (
              <MovieCard key={item.id} item={item} mediaType="movie" onTrailer={openTrailer} />
            ))}
          </div>
        </motion.section>
      )}

      {!loading && series.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <h2 className="mb-4 text-xl font-semibold">TV Series</h2>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {series.map((item) => (
              <MovieCard key={item.id} item={item} mediaType="tv" onTrailer={openTrailer} />
            ))}
          </div>
        </motion.section>
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
