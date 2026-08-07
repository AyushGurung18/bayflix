"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { SlidersHorizontal, ArrowUp, ArrowDown, User, X, RotateCcw } from "lucide-react";
import clsx from "clsx";
import MovieCard from "@/components/MovieCard";
import PersonPicker from "@/components/PersonPicker";
import TrailerModal from "@/components/TrailerModal";
import { SkeletonGrid } from "@/components/Skeletons";
import { useTrailer } from "@/lib/use-trailer";
import { discoverMovies, discoverSeries } from "@/lib/discover-query-builder";
import { fetchMovieGenres, fetchTVGenres, posterUrl } from "@/lib/tmdb";
import type { MediaType, TmdbGenre, TmdbItem, TmdbPersonSearchResult } from "@/lib/types";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

type SortField = "popularity" | "vote_average" | "date";
const SORT_LABELS: Record<SortField, string> = {
  popularity: "Popularity",
  vote_average: "Rating",
  date: "Release Date",
};

const CURRENT_YEAR = 2026; // Date.now() is deliberately avoided as a module-scope constant

export default function DiscoverPage() {
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [genres, setGenres] = useState<TmdbGenre[]>([]);
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [minRating, setMinRating] = useState("");
  const [sortField, setSortField] = useState<SortField>("popularity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [people, setPeople] = useState<TmdbPersonSearchResult[]>([]);

  const [items, setItems] = useState<TmdbItem[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { trailer, openTrailer, closeTrailer } = useTrailer();

  // Movie and TV genre ids overlap but aren't identical — a genre picked
  // under one wouldn't mean anything to the other's endpoint, so both the
  // list and the selection reset when the media type flips.
  useEffect(() => {
    let cancelled = false;
    // Clearing the previous media type's genre picks — a deliberate
    // response to mediaType changing, not derivable at render time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGenreIds([]);
    const fetcher = mediaType === "movie" ? fetchMovieGenres : fetchTVGenres;
    fetcher().then((data) => !cancelled && setGenres(data.genres ?? []));
    return () => {
      cancelled = true;
    };
  }, [mediaType]);

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        mediaType,
        genreIds,
        yearFrom,
        yearTo,
        minRating,
        sortField,
        sortDir,
        peopleIds: people.map((p) => p.id),
      }),
    [mediaType, genreIds, yearFrom, yearTo, minRating, sortField, sortDir, people]
  );
  const debouncedFilterKey = useDebouncedValue(filterKey, 450);

  // Any filter change starts a fresh search from page 1 — this effect only
  // reacts to the debounced key, the fetch effect below reacts to `page`.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [debouncedFilterKey]);

  useEffect(() => {
    let cancelled = false;
    // Full skeleton only on a fresh search (page 1) — "load more" keeps
    // the existing grid visible while the next page comes in.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (page === 1) setItems(null);

    const builder = mediaType === "movie" ? discoverMovies() : discoverSeries();
    if (genreIds.length > 0) builder.genres(genreIds, "or");
    if (minRating) builder.voteAverage({ gte: Number(minRating) });
    if (yearFrom || yearTo) {
      const range = {
        gte: yearFrom ? `${yearFrom}-01-01` : undefined,
        lte: yearTo ? `${yearTo}-12-31` : undefined,
      };
      if (mediaType === "movie") builder.primaryReleaseDate(range);
      else builder.firstAirDate(range);
    }
    if (people.length > 0) builder.people(people.map((p) => p.id), "and");
    builder.sortBy(sortField === "date" ? (mediaType === "movie" ? "primary_release_date" : "first_air_date") : sortField, sortDir);

    builder.fetch<{ results: TmdbItem[]; total_pages?: number }>(page).then((data) => {
      if (cancelled) return;
      setTotalPages(data.total_pages ?? 1);
      setItems((prev) => {
        const list = data.results ?? [];
        return page === 1 ? list : [...(prev ?? []), ...list];
      });
    });
    return () => {
      cancelled = true;
    };
    // Deliberately keyed off debouncedFilterKey (not the raw filter state)
    // so typing in the year/rating inputs doesn't fire a request per
    // keystroke; `page` is separate so "Load more" doesn't wait out the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilterKey, page]);

  const toggleGenre = (id: number) => {
    setGenreIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  const resetFilters = () => {
    setGenreIds([]);
    setYearFrom("");
    setYearTo("");
    setMinRating("");
    setSortField("popularity");
    setSortDir("desc");
    setPeople([]);
  };

  const activeFilterCount =
    genreIds.length + people.length + (yearFrom || yearTo ? 1 : 0) + (minRating ? 1 : 0);

  return (
    <div className="px-4 pb-16 pt-8 sm:px-10">
      <div className="mb-6 flex items-center gap-2">
        <SlidersHorizontal className="text-brand" size={22} />
        <h1 className="text-2xl font-bold sm:text-3xl">Advanced Search</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        {/* ---- Filter panel ---- */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <div className="flex rounded-full border border-neutral-700 bg-ink-card p-1">
            {(["movie", "tv"] as MediaType[]).map((mt) => (
              <button
                key={mt}
                onClick={() => setMediaType(mt)}
                className={clsx(
                  "flex-1 rounded-full py-1.5 text-sm font-semibold transition",
                  mediaType === mt ? "bg-brand text-white" : "text-neutral-400 hover:text-white"
                )}
              >
                {mt === "movie" ? "Movies" : "TV Shows"}
              </button>
            ))}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Genres</p>
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <button
                  key={g.id}
                  onClick={() => toggleGenre(g.id)}
                  className={clsx(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    genreIds.includes(g.id)
                      ? "border-brand bg-brand/15 text-brand"
                      : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                  )}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {mediaType === "movie" ? "Release Year" : "First Aired"}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                placeholder="From"
                min={1900}
                max={CURRENT_YEAR + 5}
                className="w-full rounded-lg border border-neutral-700 bg-ink-card px-3 py-1.5 text-sm text-white outline-none placeholder-neutral-500 focus:border-neutral-400"
              />
              <span className="text-neutral-500">–</span>
              <input
                type="number"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                placeholder="To"
                min={1900}
                max={CURRENT_YEAR + 5}
                className="w-full rounded-lg border border-neutral-700 bg-ink-card px-3 py-1.5 text-sm text-white outline-none placeholder-neutral-500 focus:border-neutral-400"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Minimum Rating</p>
            <input
              type="number"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              placeholder="e.g. 7"
              min={0}
              max={10}
              step={0.5}
              className="w-full rounded-lg border border-neutral-700 bg-ink-card px-3 py-1.5 text-sm text-white outline-none placeholder-neutral-500 focus:border-neutral-400"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Sort By</p>
            <div className="flex items-center gap-2">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="w-full rounded-lg border border-neutral-700 bg-ink-card px-3 py-1.5 text-sm text-white outline-none focus:border-neutral-400"
              >
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                aria-label={sortDir === "desc" ? "Descending" : "Ascending"}
                className="shrink-0 rounded-lg border border-neutral-700 p-2 text-neutral-300 transition hover:border-neutral-500 hover:text-white"
              >
                {sortDir === "desc" ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Cast &amp; Crew</p>
            <PersonPicker
              placeholder="Search for an actor or director…"
              excludeIds={people.map((p) => p.id)}
              onSelect={(person) => setPeople((prev) => [...prev, person])}
            />
            {people.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {people.map((person) => (
                  <span
                    key={person.id}
                    className="flex items-center gap-1.5 rounded-full border border-neutral-700 bg-ink-card py-1 pl-1 pr-2 text-xs text-white"
                  >
                    <span className="relative h-5 w-5 overflow-hidden rounded-full bg-ink-raised">
                      {person.profile_path ? (
                        <Image src={posterUrl(person.profile_path, "w92") ?? ""} alt={person.name} fill className="object-cover" />
                      ) : (
                        <User size={10} className="absolute inset-0 m-auto text-neutral-500" />
                      )}
                    </span>
                    {person.name}
                    <button
                      onClick={() => setPeople((prev) => prev.filter((p) => p.id !== person.id))}
                      aria-label={`Remove ${person.name}`}
                      className="text-neutral-400 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 transition hover:text-white"
            >
              <RotateCcw size={13} /> Reset {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}
            </button>
          )}
        </div>

        {/* ---- Results ---- */}
        <div>
          {items === null && <SkeletonGrid count={12} />}

          {items !== null && items.length === 0 && (
            <p className="mt-10 text-center text-neutral-500">
              No {mediaType === "movie" ? "movies" : "TV shows"} match those filters — try loosening one.
            </p>
          )}

          {items !== null && items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-wrap gap-3 sm:gap-4"
            >
              {items.map((item) => (
                <MovieCard key={item.id} item={item} mediaType={mediaType} onTrailer={openTrailer} />
              ))}
            </motion.div>
          )}

          {items !== null && page < totalPages && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="mt-6 rounded border border-neutral-500 px-5 py-2 text-sm font-medium text-neutral-200 transition hover:border-white hover:text-white"
            >
              Load more
            </button>
          )}
        </div>
      </div>

      <TrailerModal videoKey={trailer?.key} title={trailer?.title} onClose={closeTrailer} />
    </div>
  );
}
