"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth-context";
import {
  isBayflixApiConfigured,
  getWatchlist,
  getWatched,
  getMyRatings,
  addToWatchlist,
  removeFromWatchlist,
  addToWatched,
  rateTitle as rateTitleApi,
  removeRating,
} from "./bayflix-api";

const WatchStatusContext = createContext(null);

const relationKey = (mediaType, id) => `${mediaType}:${id}`;

export function WatchStatusProvider({ children }) {
  const { currentUser } = useAuth();
  const configured = isBayflixApiConfigured();
  const [watchlist, setWatchlist] = useState([]);
  const [watched, setWatched] = useState([]);
  const [ratings, setRatings] = useState([]);

  const refresh = useCallback(async () => {
    if (!configured || !currentUser) {
      setWatchlist([]);
      setWatched([]);
      setRatings([]);
      return;
    }
    const [wl, w, r] = await Promise.all([getWatchlist(), getWatched(), getMyRatings()]);
    setWatchlist(wl);
    setWatched(w);
    setRatings(r);
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
  const ratingsMap = useMemo(
    () => new Map(ratings.map((i) => [relationKey(i.media_type, i.id), i.stars])),
    [ratings]
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

  const rateTitle = useCallback(async (item, mediaType, stars) => {
    const k = relationKey(mediaType, item.id);
    if (stars === 0) {
      setRatings((list) => list.filter((i) => relationKey(i.media_type, i.id) !== k));
      await removeRating(item.id, mediaType);
      return;
    }
    setRatings((list) => [
      { ...item, media_type: mediaType, stars },
      ...list.filter((i) => relationKey(i.media_type, i.id) !== k),
    ]);
    await rateTitleApi(item, mediaType, stars);
  }, []);

  const value = {
    configured,
    watchlist,
    watched,
    ratings,
    watchlistIds,
    watchedIds,
    ratingsMap,
    toggleWatchlist,
    markWatched,
    rateTitle,
    refresh,
  };

  return <WatchStatusContext.Provider value={value}>{children}</WatchStatusContext.Provider>;
}

export function useWatchStatus() {
  const ctx = useContext(WatchStatusContext);
  if (!ctx) throw new Error("useWatchStatus must be used within a WatchStatusProvider");
  return ctx;
}
