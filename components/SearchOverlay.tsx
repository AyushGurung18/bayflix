"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Search as SearchIcon, X, Clock, Sparkles } from "lucide-react";
import { searchMulti } from "@/lib/tmdb";
import { isBayflixApiConfigured, semanticSearch } from "@/lib/bayflix-api";
import { posterUrl } from "@/lib/tmdb";
import { BLUR_DATA_URL } from "@/lib/image-utils";
import type { TmdbItem } from "@/lib/types";

const RECENT_KEY = "bayflix:recent-searches";

interface PersonResult {
  id: number;
  media_type: "person";
  name: string;
  profile_path: string | null;
  known_for_department?: string;
  known_for?: TmdbItem[];
}

type SearchHit = TmdbItem | PersonResult;

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function addRecent(q: string) {
  const list = [q, ...getRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const aiAvailable = isBayflixApiConfigured();

  useEffect(() => {
    // Deliberate reset in response to the open/close prop changing, not
    // something derivable at render time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setRecent(getRecent());
    else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      const request = aiMode && aiAvailable
        ? semanticSearch(trimmed).then((list) => list as SearchHit[])
        : searchMulti(trimmed).then((data) => (data.results ?? []) as unknown as SearchHit[]);

      request
        .then((list) => {
          if (cancelled) return;
          setResults(list);
          addRecent(trimmed);
        })
        .catch((err) => console.error(err))
        .finally(() => !cancelled && setLoading(false));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, aiMode, aiAvailable]);

  // results can briefly hold the previous query's data after the input is
  // cleared (nothing re-derives it synchronously) — gating on the trimmed
  // query here means the empty state doesn't need its own effect/reset.
  const hasQuery = Boolean(query.trim());
  const movies = hasQuery ? (results.filter((r) => r.media_type === "movie") as TmdbItem[]) : [];
  const series = hasQuery ? (results.filter((r) => r.media_type === "tv") as TmdbItem[]) : [];
  const people = hasQuery ? (results.filter((r) => r.media_type === "person") as PersonResult[]) : [];

  const goTo = (item: TmdbItem) => {
    onClose();
    router.push(item.media_type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] overflow-y-auto overscroll-contain bg-black/70 backdrop-blur-xl"
          data-lenis-prevent
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-20 pt-20 sm:pt-28"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400" size={24} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={aiMode ? "Describe what you're in the mood for…" : "Search movies, TV shows, people…"}
                className="w-full rounded-2xl border border-white/15 bg-ink-card/90 py-5 pl-14 pr-14 text-lg text-white shadow-2xl outline-none placeholder-neutral-500 focus:border-white/40"
              />
              <button
                onClick={onClose}
                aria-label="Close search"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between">
              {aiAvailable ? (
                <button
                  onClick={() => setAiMode((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    aiMode
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
                  }`}
                >
                  <Sparkles size={13} /> AI Search {aiMode ? "on" : "off"}
                </button>
              ) : (
                <span />
              )}
              <span className="text-xs text-neutral-500">Press Esc to close</span>
            </div>

            {!query.trim() && recent.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <Clock size={13} /> Recent Searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recent.map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuery(q)}
                      className="rounded-full border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition hover:border-white hover:text-white"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && <p className="mt-10 text-center text-neutral-500">Searching…</p>}

            {!loading && query.trim() && results.length === 0 && (
              <p className="mt-10 text-center text-neutral-500">
                No matches found for &ldquo;{query.trim()}&rdquo;.
              </p>
            )}

            {!loading && movies.length > 0 && (
              <ResultGroup title="Movies">
                {movies.slice(0, 8).map((item) => (
                  <button key={item.id} onClick={() => goTo(item)} className="text-left">
                    <MiniCard item={item} />
                  </button>
                ))}
              </ResultGroup>
            )}

            {!loading && series.length > 0 && (
              <ResultGroup title="TV Shows">
                {series.slice(0, 8).map((item) => (
                  <button key={item.id} onClick={() => goTo(item)} className="text-left">
                    <MiniCard item={item} />
                  </button>
                ))}
              </ResultGroup>
            )}

            {!loading && people.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Cast &amp; Crew
                </h3>
                <div className="flex flex-col gap-3">
                  {people.slice(0, 5).map((person) => (
                    <button
                      key={person.id}
                      onClick={() => {
                        onClose();
                        router.push(`/person/${person.id}`);
                      }}
                      className="group flex items-center gap-3 rounded-lg p-1.5 text-left transition hover:bg-white/5"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-ink-card">
                        {person.profile_path && (
                          <Image
                            src={posterUrl(person.profile_path, "w185") ?? ""}
                            alt={person.name}
                            fill
                            placeholder="blur"
                            blurDataURL={BLUR_DATA_URL}
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white group-hover:underline">
                          {person.name}
                        </p>
                        <p className="truncate text-xs text-neutral-500">
                          {person.known_for_department || "Actor"}
                          {person.known_for && person.known_for.length > 0 && (
                            <> &middot; {person.known_for.map((k) => k.title || k.name).filter(Boolean).join(", ")}</>
                          )}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ResultGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-8">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
    </div>
  );
}

function MiniCard({ item }: { item: TmdbItem }) {
  const title = item.title || item.name || "Untitled";
  return (
    <div className="group overflow-hidden rounded-lg bg-ink-card transition hover:ring-2 hover:ring-white/30">
      <div className="relative aspect-[2/3] w-full">
        {item.poster_path ? (
          <Image
            src={posterUrl(item.poster_path, "w185") ?? ""}
            alt={title}
            fill
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            sizes="200px"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-ink-card text-xs text-neutral-600">
            No image
          </div>
        )}
      </div>
      <p className="truncate px-1.5 py-2 text-xs font-medium text-neutral-200">{title}</p>
    </div>
  );
}
