"use client";

import { auth } from "./firebase";
import type { MediaType, Profile, RatingsResult, TmdbItem } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_BAYFLIX_API_BASE_URL;

export function isBayflixApiConfigured() {
  return Boolean(BASE_URL);
}

async function authHeaders(): Promise<Record<string, string> | null> {
  const user = auth?.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

interface CallOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  profileId?: string;
}

async function call<T = unknown>(path: string, options: CallOptions = {}): Promise<T | null> {
  if (!BASE_URL) return null;
  const { method = "GET", body, auth: needsAuth = false, profileId } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (needsAuth) {
    const h = await authHeaders();
    if (!h) return null; // not signed in yet — treat as "no data" rather than erroring
    Object.assign(headers, h);
  }
  if (profileId) headers["X-Profile-Id"] = profileId;

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Bayflix API ${path} failed (${res.status})`);
    return res.json();
  } catch (err) {
    console.error(`Bayflix API request failed: ${path}`, err);
    return null;
  }
}

function toRelationPayload(item: TmdbItem, mediaType: MediaType) {
  return {
    tmdbId: item.id,
    mediaType,
    title: item.title || item.name,
    overview: item.overview || null,
    posterPath: item.poster_path || null,
    backdropPath: item.backdrop_path || null,
    releaseDate: item.release_date || item.first_air_date || null,
    voteAverage: item.vote_average ?? null,
  };
}

interface RelationResponse {
  results: TmdbItem[];
}

export async function getWatchlist(profileId?: string) {
  const data = await call<RelationResponse>("/watchlist", { auth: true, profileId });
  return data?.results ?? [];
}
export async function addToWatchlist(item: TmdbItem, mediaType: MediaType, profileId?: string) {
  return call("/watchlist", { method: "POST", auth: true, profileId, body: toRelationPayload(item, mediaType) });
}
export async function removeFromWatchlist(tmdbId: number, mediaType: MediaType, profileId?: string) {
  return call(`/watchlist?tmdbId=${tmdbId}&mediaType=${mediaType}`, { method: "DELETE", auth: true, profileId });
}

export async function getWatched(profileId?: string) {
  const data = await call<RelationResponse>("/watched", { auth: true, profileId });
  return data?.results ?? [];
}
export async function addToWatched(item: TmdbItem, mediaType: MediaType, profileId?: string) {
  return call("/watched", { method: "POST", auth: true, profileId, body: toRelationPayload(item, mediaType) });
}
export async function removeFromWatched(tmdbId: number, mediaType: MediaType, profileId?: string) {
  return call(`/watched?tmdbId=${tmdbId}&mediaType=${mediaType}`, { method: "DELETE", auth: true, profileId });
}

export async function semanticSearch(query: string) {
  if (!query.trim()) return [];
  const data = await call<RelationResponse>(`/search?q=${encodeURIComponent(query)}`);
  return data?.results ?? [];
}

export async function getRecommendations(profileId?: string) {
  const data = await call<RelationResponse>("/recommendations", { auth: true, profileId });
  return data?.results ?? [];
}

interface GetRatingsArgs {
  tmdbId: number;
  mediaType: MediaType;
  imdbId?: string | null;
  title?: string | null;
  year?: string | null;
}

// Shared crowd ratings (IMDb/Rotten Tomatoes/Metacritic), D1-cached on the
// worker — replaces the old direct-to-OMDb Next.js proxy. imdbId is
// preferred; title/year are a fallback when it isn't known yet.
export async function getRatings({ tmdbId, mediaType, imdbId, title, year }: GetRatingsArgs) {
  const params = new URLSearchParams({ tmdbId: String(tmdbId), mediaType });
  if (imdbId) params.set("imdbId", imdbId);
  if (title) params.set("title", title);
  if (year) params.set("year", year);
  return call<RatingsResult>(`/ratings?${params.toString()}`);
}

export async function getMyRatings(profileId?: string) {
  const data = await call<RelationResponse>("/ratings/mine", { auth: true, profileId });
  return data?.results ?? [];
}
export async function rateTitle(item: TmdbItem, mediaType: MediaType, stars: number, profileId?: string) {
  return call("/ratings/mine", {
    method: "POST",
    auth: true,
    profileId,
    body: { ...toRelationPayload(item, mediaType), stars },
  });
}
export async function removeRating(tmdbId: number, mediaType: MediaType, profileId?: string) {
  return call(`/ratings/mine?tmdbId=${tmdbId}&mediaType=${mediaType}`, { method: "DELETE", auth: true, profileId });
}

interface ProfilesResponse {
  results: Profile[];
}

export async function getProfiles() {
  const data = await call<ProfilesResponse>("/profiles", { auth: true });
  return data?.results ?? [];
}
export async function createProfile(name: string, avatarColor: string, avatarEmoji: string) {
  return call<Profile>("/profiles", {
    method: "POST",
    auth: true,
    body: { name, avatarColor, avatarEmoji },
  });
}
export async function deleteProfile(id: string) {
  return call(`/profiles?id=${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
}
