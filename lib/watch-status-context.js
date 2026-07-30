"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth-context";
import {
  isBayflixApiConfigured,
  getWatchlist,
  getWatched,
  addToWatchlist,
  removeFromWatchlist,
  addToWatched,
} from "./bayflix-api";

const WatchStatusContext = createContext(null);

const relationKey = (mediaType, id) => `${mediaType}:${id}`;

export function WatchStatusProvider({ children }) {
  const { currentUser } = useAuth();
  const configured = isBayflixApiConfigured();
  const [watchlist, setWatchlist] = useState([]);
  const [watched, setWatched] = useState([]);

  const refresh = useCallback(async () => {
    if (!configured || !currentUser) {
      setWatchlist([]);
      setWatched([]);
      return;
    }
    const [wl, w] = await Promise.all([getWatchlist(), getWatched()]);
    setWatchlist(wl);
    setWatched(w);
  }, [configured, currentUser]);

  useEffect(() => {
    // refresh() clears the lists synchronously when signed out — that's a
    // deliberate response to the auth dependency changing, not avoidable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const watchlistIds = useMemo(
    () => new Set(watchlist.map((i) => relationKey(i.media_type, i.id))),
    [watchlist]
  );
  const watchedIds = useMemo(
    () => new Set(watched.map((i) => relationKey(i.media_type, i.id))),
    [watched]
  );

  const toggleWatchlist = useCallback(
    async (item, mediaType) => {
      const k = relationKey(mediaType, item.id);
      if (watchlistIds.has(k)) {
        setWatchlist((list) => list.filter((i) => relationKey(i.media_type, i.id) !== k));
        await removeFromWatchlist(item.id, mediaType);
      } else {
        setWatchlist((list) => [{ ...item, media_type: mediaType }, ...list]);
        await addToWatchlist(item, mediaType);
      }
    },
    [watchlistIds]
  );

  const markWatched = useCallback(
    async (item, mediaType) => {
      const k = relationKey(mediaType, item.id);
      if (watchedIds.has(k)) return;
      setWatched((list) => [{ ...item, media_type: mediaType }, ...list]);
      await addToWatched(item, mediaType);
    },
    [watchedIds]
  );

  const value = {
    configured,
    watchlist,
    watched,
    watchlistIds,
    watchedIds,
    toggleWatchlist,
    markWatched,
    refresh,
  };

  return <WatchStatusContext.Provider value={value}>{children}</WatchStatusContext.Provider>;
}

export function useWatchStatus() {
  const ctx = useContext(WatchStatusContext);
  if (!ctx) throw new Error("useWatchStatus must be used within a WatchStatusProvider");
  return ctx;
}
