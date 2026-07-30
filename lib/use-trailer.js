"use client";

import { useCallback, useState } from "react";
import { fetchMovieVideos, fetchTVVideos, pickTrailer } from "./tmdb";

// Shared "open a trailer modal for this card" behaviour used on the browse
// dashboard, category grids, and search results — row items only carry list
// summaries, so the videos have to be fetched lazily on demand.
export function useTrailer() {
  const [trailer, setTrailer] = useState(null); // { key, title }

  const openTrailer = useCallback(async (item, mediaType) => {
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

  const openTrailerDirect = useCallback((key, title) => {
    if (key) setTrailer({ key, title });
  }, []);

  const closeTrailer = useCallback(() => setTrailer(null), []);

  return { trailer, openTrailer, openTrailerDirect, closeTrailer };
}
