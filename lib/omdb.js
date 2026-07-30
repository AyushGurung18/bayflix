"use client";

// Returns null when there's genuinely nothing to show (not configured, or
// OMDb has no record) — components can treat null as "render nothing" and a
// populated object as "render badges." { configured:false } is exposed too
// so a placeholder hint can be shown while OMDB_API_KEY isn't set yet.
export async function fetchOmdbRatings({ imdbId, title, year }) {
  if (!imdbId && !title) return null;

  const params = new URLSearchParams();
  if (imdbId) params.set("imdbId", imdbId);
  else {
    params.set("title", title);
    if (year) params.set("year", year);
  }

  try {
    const res = await fetch(`/api/omdb?${params.toString()}`);
    const data = await res.json();
    if (!data.configured) return { configured: false };
    if (!data.found) return null;
    return data;
  } catch (error) {
    console.error("Failed to fetch OMDb ratings", error);
    return null;
  }
}
