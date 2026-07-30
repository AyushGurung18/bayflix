"use client";

import { auth } from "./firebase";

const BASE_URL = process.env.NEXT_PUBLIC_BAYFLIX_API_BASE_URL;

export function isBayflixApiConfigured() {
  return Boolean(BASE_URL);
}

async function authHeaders() {
  const user = auth?.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function call(path, { method = "GET", body, auth: needsAuth = false } = {}) {
  if (!BASE_URL) return null;

  const headers = { "Content-Type": "application/json" };
  if (needsAuth) {
    const h = await authHeaders();
    if (!h) return null; // not signed in yet — treat as "no data" rather than erroring
    Object.assign(headers, h);
  }

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

function toRelationPayload(item, mediaType) {
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

export async function getWatchlist() {
  const data = await call("/watchlist", { auth: true });
  return data?.results ?? [];
}
export async function addToWatchlist(item, mediaType) {
  return call("/watchlist", { method: "POST", auth: true, body: toRelationPayload(item, mediaType) });
}
export async function removeFromWatchlist(tmdbId, mediaType) {
  return call(`/watchlist?tmdbId=${tmdbId}&mediaType=${mediaType}`, { method: "DELETE", auth: true });
}

export async function getWatched() {
  const data = await call("/watched", { auth: true });
  return data?.results ?? [];
}
export async function addToWatched(item, mediaType) {
  return call("/watched", { method: "POST", auth: true, body: toRelationPayload(item, mediaType) });
}
export async function removeFromWatched(tmdbId, mediaType) {
  return call(`/watched?tmdbId=${tmdbId}&mediaType=${mediaType}`, { method: "DELETE", auth: true });
}

export async function semanticSearch(query) {
  if (!query.trim()) return [];
  const data = await call(`/search?q=${encodeURIComponent(query)}`);
  return data?.results ?? [];
}

export async function getRecommendations() {
  const data = await call("/recommendations", { auth: true });
  return data?.results ?? [];
}
