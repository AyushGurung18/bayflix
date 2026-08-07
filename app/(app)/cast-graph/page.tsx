"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Network, Search, Loader2, Film, Tv } from "lucide-react";
import clsx from "clsx";
import PersonPicker from "@/components/PersonPicker";
import CastGraphView from "@/components/CastGraphView";
import { fetchTitleCastGraph, fetchActorConnectionGraph, toCytoscapeElements } from "@/lib/cast-graph";
import { searchMulti, posterUrl } from "@/lib/tmdb";
import type { CastGraph } from "@/lib/cast-graph";
import type { CytoscapeElements } from "@/lib/graph-adapters";
import type { MediaType, TmdbItem, TmdbPersonSearchResult } from "@/lib/types";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

type Mode = "connection" | "title";

export default function CastGraphPage() {
  const [mode, setMode] = useState<Mode>("connection");
  const [graph, setGraph] = useState<CastGraph | null>(null);
  const [elements, setElements] = useState<CytoscapeElements | null>(null);
  const [rootId, setRootId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- "connect two actors" mode ----
  const [actorA, setActorA] = useState<TmdbPersonSearchResult | null>(null);
  const [actorB, setActorB] = useState<TmdbPersonSearchResult | null>(null);

  const findConnection = () => {
    if (!actorA || !actorB) return;
    setLoading(true);
    setError(null);
    setGraph(null);
    setElements(null);
    fetchActorConnectionGraph({ actorId1: actorA.id, actorId2: actorB.id })
      .then((g) => {
        setGraph(g);
        setElements(toCytoscapeElements(g));
        setRootId(`person:${actorA.id}`);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  };

  // ---- "explore a title's cast" mode ----
  const [titleQuery, setTitleQuery] = useState("");
  const [titleResults, setTitleResults] = useState<TmdbItem[]>([]);
  const [titleDropdownOpen, setTitleDropdownOpen] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<TmdbItem | null>(null);
  const debouncedTitleQuery = useDebouncedValue(titleQuery, 350);
  const titleContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = debouncedTitleQuery.trim();
    if (!trimmed) {
      // Clearing stale results when the query is emptied out — a
      // deliberate response to that state change, not derivable at render time.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitleResults([]);
      return;
    }
    let cancelled = false;
    searchMulti(trimmed).then((data) => {
      if (cancelled) return;
      setTitleResults((data.results ?? []).filter((r) => r.media_type === "movie" || r.media_type === "tv"));
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedTitleQuery]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (titleContainerRef.current && !titleContainerRef.current.contains(e.target as Node)) {
        setTitleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!selectedTitle) return;
    const mediaType: MediaType = selectedTitle.media_type === "tv" ? "tv" : "movie";
    // Kicking off the loading state and clearing the previous title's
    // graph for the async fetch below — a deliberate response to
    // selectedTitle changing, not derivable at render time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setGraph(null);
    setElements(null);
    let cancelled = false;
    fetchTitleCastGraph({ mediaType, id: selectedTitle.id, castLimit: 18 })
      .then((g) => {
        if (cancelled) return;
        setGraph(g);
        setElements(toCytoscapeElements(g));
        setRootId(`title:${mediaType}:${selectedTitle.id}`);
      })
      .catch((err) => !cancelled && setError((err as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selectedTitle]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setGraph(null);
    setElements(null);
    setError(null);
    setRootId(undefined);
  };

  return (
    <div className="px-4 pb-16 pt-8 sm:px-10">
      <div className="mb-6 flex items-center gap-2">
        <Network className="text-brand" size={22} />
        <h1 className="text-2xl font-bold sm:text-3xl">Cast Connections</h1>
      </div>

      <div className="mb-6 flex max-w-md rounded-full border border-neutral-700 bg-ink-card p-1">
        <button
          onClick={() => switchMode("connection")}
          className={clsx(
            "flex-1 rounded-full py-1.5 text-sm font-semibold transition",
            mode === "connection" ? "bg-brand text-white" : "text-neutral-400 hover:text-white"
          )}
        >
          Connect Two Actors
        </button>
        <button
          onClick={() => switchMode("title")}
          className={clsx(
            "flex-1 rounded-full py-1.5 text-sm font-semibold transition",
            mode === "title" ? "bg-brand text-white" : "text-neutral-400 hover:text-white"
          )}
        >
          Explore a Title&rsquo;s Cast
        </button>
      </div>

      {mode === "connection" ? (
        <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-end">
          <div className="w-full max-w-xs">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">Actor A</p>
            <PersonPicker
              placeholder="First actor…"
              selected={actorA}
              onClear={() => setActorA(null)}
              excludeIds={actorB ? [actorB.id] : []}
              onSelect={setActorA}
            />
          </div>
          <div className="w-full max-w-xs">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">Actor B</p>
            <PersonPicker
              placeholder="Second actor…"
              selected={actorB}
              onClear={() => setActorB(null)}
              excludeIds={actorA ? [actorA.id] : []}
              onSelect={setActorB}
            />
          </div>
          <button
            onClick={findConnection}
            disabled={!actorA || !actorB || loading}
            className="glow-brand flex items-center gap-2 rounded bg-gradient-to-br from-brand to-brand-dark px-5 py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Find Connection
          </button>
        </div>
      ) : (
        <div ref={titleContainerRef} className="relative mb-6 max-w-md">
          <input
            value={titleQuery}
            onChange={(e) => {
              setTitleQuery(e.target.value);
              setTitleDropdownOpen(true);
            }}
            onFocus={() => setTitleDropdownOpen(true)}
            placeholder="Search for a movie or TV show…"
            className="w-full rounded-full border border-neutral-700 bg-ink-card px-4 py-2.5 text-sm text-white outline-none placeholder-neutral-500 focus:border-neutral-400"
          />
          {selectedTitle && (
            <p className="mt-2 text-sm text-neutral-400">
              Showing cast of <span className="font-semibold text-white">{selectedTitle.title || selectedTitle.name}</span>
            </p>
          )}
          {titleDropdownOpen && titleResults.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-neutral-700 bg-ink-raised shadow-xl">
              {titleResults.slice(0, 8).map((item) => (
                <button
                  key={`${item.media_type}-${item.id}`}
                  onClick={() => {
                    setSelectedTitle(item);
                    setTitleQuery("");
                    setTitleResults([]);
                    setTitleDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-white/5"
                >
                  <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-ink-card">
                    {item.poster_path ? (
                      <Image src={posterUrl(item.poster_path, "w92") ?? ""} alt="" fill className="object-cover" />
                    ) : item.media_type === "tv" ? (
                      <Tv size={14} className="absolute inset-0 m-auto text-neutral-500" />
                    ) : (
                      <Film size={14} className="absolute inset-0 m-auto text-neutral-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{item.title || item.name}</p>
                    <p className="text-xs text-neutral-500">
                      {(item.release_date || item.first_air_date || "").slice(0, 4)} &middot;{" "}
                      {item.media_type === "tv" ? "TV" : "Movie"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-400">Something went wrong: {error}</p>}

      {loading && (
        <div className="flex h-[400px] items-center justify-center rounded-xl border border-white/10 bg-ink-card">
          <Loader2 className="animate-spin text-neutral-500" size={28} />
        </div>
      )}

      {!loading && graph && mode === "connection" && (
        <p className="mb-4 text-sm text-neutral-300">
          {graph.connected ? (
            graph.degrees === 1 ? (
              <>
                🎬 <span className="font-semibold text-white">{actorA?.name}</span> and{" "}
                <span className="font-semibold text-white">{actorB?.name}</span> starred together directly.
              </>
            ) : (
              <>
                🔗 <span className="font-semibold text-white">{actorA?.name}</span> and{" "}
                <span className="font-semibold text-white">{actorB?.name}</span> are connected through{" "}
                {(graph.degrees ?? 1) - 1} other {(graph.degrees ?? 1) - 1 === 1 ? "person" : "people"}.
              </>
            )
          ) : (
            <>
              No connection found between {actorA?.name} and {actorB?.name} within the search limits.
              {graph.truncated && " (The search hit its budget before finishing — they may still be connected.)"}
            </>
          )}
        </p>
      )}

      {!loading && elements && graph && (graph.nodes.length > (mode === "connection" && !graph.connected ? 0 : 1)) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <CastGraphView
            elements={elements}
            layout={mode === "connection" ? "breadthfirst" : "concentric"}
            rootId={rootId}
            height={mode === "connection" ? 420 : 560}
          />
          <p className="mt-3 text-center text-xs text-neutral-500">
            Drag to pan, scroll to zoom, click a node to open that {mode === "connection" ? "person or title" : "cast member"}.
          </p>
        </motion.div>
      )}

      {!loading && !graph && !error && (
        <div className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-700 text-center text-neutral-500">
          <Network size={28} />
          <p className="max-w-xs text-sm">
            {mode === "connection"
              ? "Pick two actors to map out how they're connected through shared movies and TV shows."
              : "Search for a movie or TV show to see its cast laid out as a graph."}
          </p>
        </div>
      )}
    </div>
  );
}
