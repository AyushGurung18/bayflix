"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import { useProfiles } from "./profile-context";
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
import type { MediaType, TmdbItem } from "./types";

type RelationItem = TmdbItem & { media_type: MediaType };

interface WatchStatusValue {
  configured: boolean;
  watchlist: RelationItem[];
  watched: RelationItem[];
  ratings: RelationItem[];
  watchlistIds: Set<string>;
  watchedIds: Set<string>;
  ratingsMap: Map<string, number>;
  toggleWatchlist: (item: TmdbItem, mediaType: MediaType) => Promise<void>;
  markWatched: (item: TmdbItem, mediaType: MediaType) => Promise<void>;
  rateTitle: (item: TmdbItem, mediaType: MediaType, stars: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const WatchStatusContext = createContext<WatchStatusValue | null>(null);

const relationKey = (mediaType: MediaType, id: number) => `${mediaType}:${id}`;

export function WatchStatusProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const { activeProfile } = useProfiles();
  const configured = isBayflixApiConfigured();
  const [watchlist, setWatchlist] = useState<RelationItem[]>([]);
  const [watched, setWatched] = useState<RelationItem[]>([]);
  const [ratings, setRatings] = useState<RelationItem[]>([]);

  const profileId = activeProfile?.id;

  const refresh = useCallback(async () => {
    if (!configured || !currentUser || !profileId) {
      setWatchlist([]);
      setWatched([]);
      setRatings([]);
      return;
    }
    const [wl, w, r] = await Promise.all([
      getWatchlist(profileId),
      getWatched(profileId),
      getMyRatings(profileId),
    ]);
    setWatchlist(wl as RelationItem[]);
    setWatched(w as RelationItem[]);
    setRatings(r as RelationItem[]);
  }, [configured, currentUser, profileId]);

  useEffect(() => {
    // refresh() clears the lists synchronously when signed out or switched
    // to a different profile — a deliberate response to those dependencies
    // changing, not avoidable.
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
    () => new Map(ratings.map((i) => [relationKey(i.media_type, i.id), i.stars ?? 0])),
    [ratings]
  );

  const toggleWatchlist = useCallback(
    async (item: TmdbItem, mediaType: MediaType) => {
      if (!profileId) return;
      const k = relationKey(mediaType, item.id);
      if (watchlistIds.has(k)) {
        setWatchlist((list) => list.filter((i) => relationKey(i.media_type, i.id) !== k));
        await removeFromWatchlist(item.id, mediaType, profileId);
      } else {
        setWatchlist((list) => [{ ...item, media_type: mediaType }, ...list]);
        await addToWatchlist(item, mediaType, profileId);
      }
    },
    [watchlistIds, profileId]
  );

  const markWatched = useCallback(
    async (item: TmdbItem, mediaType: MediaType) => {
      if (!profileId) return;
      const k = relationKey(mediaType, item.id);
      if (watchedIds.has(k)) return;
      setWatched((list) => [{ ...item, media_type: mediaType }, ...list]);
      await addToWatched(item, mediaType, profileId);
    },
    [watchedIds, profileId]
  );

  const rateTitle = useCallback(
    async (item: TmdbItem, mediaType: MediaType, stars: number) => {
      if (!profileId) return;
      const k = relationKey(mediaType, item.id);
      if (stars === 0) {
        setRatings((list) => list.filter((i) => relationKey(i.media_type, i.id) !== k));
        await removeRating(item.id, mediaType, profileId);
        return;
      }
      setRatings((list) => [
        { ...item, media_type: mediaType, stars },
        ...list.filter((i) => relationKey(i.media_type, i.id) !== k),
      ]);
      await rateTitleApi(item, mediaType, stars, profileId);
    },
    [profileId]
  );

  const value: WatchStatusValue = {
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
