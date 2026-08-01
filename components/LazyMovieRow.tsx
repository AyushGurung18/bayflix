"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import MovieRow from "./MovieRow";
import type { MediaType, TmdbItem, TmdbListResponse } from "@/lib/types";

interface LazyMovieRowProps {
  title: string;
  fetcher: () => Promise<TmdbListResponse>;
  mediaType?: MediaType;
  exploreHref?: string;
  onTrailer?: (item: TmdbItem, mediaType: MediaType) => void;
}

// Doesn't fetch its own data until it's about to scroll into view — the
// point is to keep the initial page load to only what's above the fold,
// instead of every row's TMDB request racing (and blocking the skeleton)
// on mount.
export default function LazyMovieRow({ title, fetcher, mediaType, exploreHref, onTrailer }: LazyMovieRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "800px 0px" });
  const [items, setItems] = useState<TmdbItem[] | null>(null);

  useEffect(() => {
    if (!inView || items !== null) return;
    let cancelled = false;
    fetcher().then((data) => !cancelled && setItems(data.results ?? []));
    return () => {
      cancelled = true;
    };
    // fetcher is a stable reference per row (defined once by the caller);
    // re-running this on every render would refire the fetch endlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, items]);

  if (items === null) {
    return <div ref={ref} className="h-[320px] sm:h-[420px]" />;
  }
  if (items.length === 0) return null;

  return (
    <MovieRow title={title} items={items} mediaType={mediaType} exploreHref={exploreHref} onTrailer={onTrailer} />
  );
}
