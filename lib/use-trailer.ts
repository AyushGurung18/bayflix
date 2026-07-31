"use client";

import { useCallback, useState } from "react";
import { fetchMovieVideos, fetchTVVideos, pickTrailer } from "./tmdb";
import type { MediaType, TmdbItem } from "./types";

interface TrailerState {
  key: string;
  title: string;
}

// Shared "open a trailer modal for this card" behaviour used on the browse
// dashboard, category grids, and search results — row items only carry list
// summaries, so the videos have to be fetched lazily on demand.
export function useTrailer() {
  const [trailer, setTrailer] = useState<TrailerState | null>(null);

  const openTrailer = useCallback(async (item: TmdbItem, mediaType: MediaType) => {
    const title = item.title || item.name || "";
    try {
      const videos =
        mediaType === "tv" ? await fetchTVVideos(item.id) : await fetchMovieVideos(item.id);
      const picked = pickTrailer(videos);
      if (picked) setTrailer({ key: picked.key, title });
    } catch (err) {
      console.error("Failed to load trailer", err);
    }
  }, []);

  const openTrailerDirect = useCallback((key?: string, title?: string) => {
    if (key) setTrailer({ key, title: title ?? "" });
  }, []);

  const closeTrailer = useCallback(() => setTrailer(null), []);

  return { trailer, openTrailer, openTrailerDirect, closeTrailer };
}
