"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { User, X } from "lucide-react";
import { posterUrl, searchPeople } from "@/lib/tmdb";
import type { TmdbPersonSearchResult } from "@/lib/types";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface PersonPickerProps {
  placeholder?: string;
  onSelect: (person: TmdbPersonSearchResult) => void;
  /** IDs to hide from results — e.g. people already picked elsewhere in the same form. */
  excludeIds?: number[];
  /** Selected person to render as a filled/cleared state instead of a live search box (single-select use, e.g. the cast-graph actor inputs). */
  selected?: TmdbPersonSearchResult | null;
  onClear?: () => void;
}

// Debounced TMDB person search with a results dropdown — shared by the
// Advanced Search page's cast/crew filter (multi-select: parent renders
// chips, this just fires onSelect and clears itself) and the cast-graph
// page's two actor inputs (single-select: pass `selected`/`onClear` to
// show a filled chip in place of the input once someone's picked).
export default function PersonPicker({
  placeholder = "Search for an actor or crew member…",
  onSelect,
  excludeIds = [],
  selected,
  onClear,
}: PersonPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbPersonSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 350);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      // Clearing stale results when the query is emptied out — a
      // deliberate response to that prop/state change, not derivable at
      // render time.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    let cancelled = false;
    searchPeople(trimmed).then((data) => {
      if (!cancelled) setResults(data.results ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const visibleResults = results.filter((r) => !excludeIds.includes(r.id));

  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-neutral-700 bg-ink-card py-1.5 pl-1.5 pr-3">
        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-ink-raised">
          {selected.profile_path ? (
            <Image src={posterUrl(selected.profile_path, "w92") ?? ""} alt={selected.name} fill className="object-cover" />
          ) : (
            <User size={14} className="absolute inset-0 m-auto text-neutral-500" />
          )}
        </div>
        <span className="text-sm font-medium text-white">{selected.name}</span>
        {onClear && (
          <button onClick={onClear} aria-label={`Remove ${selected.name}`} className="text-neutral-400 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-full border border-neutral-700 bg-ink-card px-4 py-2 text-sm text-white outline-none placeholder-neutral-500 focus:border-neutral-400"
      />
      {open && visibleResults.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-neutral-700 bg-ink-raised shadow-xl">
          {visibleResults.slice(0, 8).map((person) => (
            <button
              key={person.id}
              onClick={() => {
                onSelect(person);
                setQuery("");
                setResults([]);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-white/5"
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-ink-card">
                {person.profile_path ? (
                  <Image src={posterUrl(person.profile_path, "w92") ?? ""} alt={person.name} fill className="object-cover" />
                ) : (
                  <User size={16} className="absolute inset-0 m-auto text-neutral-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{person.name}</p>
                {person.known_for_department && (
                  <p className="truncate text-xs text-neutral-500">{person.known_for_department}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
