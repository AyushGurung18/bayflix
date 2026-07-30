import { NextResponse } from "next/server";

// Proxies OMDb (omdbapi.com) for IMDb/Rotten Tomatoes/Metacritic ratings —
// same "key stays server-side" pattern as the TMDB proxy. Returns
// { configured: false } (200, not an error) when OMDB_API_KEY isn't set yet,
// so the UI can render a "coming soon" placeholder instead of failing.
export async function GET(request) {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ configured: false });
  }

  const { searchParams } = new URL(request.url);
  const imdbId = searchParams.get("imdbId");
  const title = searchParams.get("title");
  const year = searchParams.get("year");

  if (!imdbId && !title) {
    return NextResponse.json({ error: "imdbId or title is required" }, { status: 400 });
  }

  const omdbParams = new URLSearchParams({ apikey: apiKey });
  if (imdbId) {
    omdbParams.set("i", imdbId);
  } else {
    omdbParams.set("t", title);
    if (year) omdbParams.set("y", year);
  }

  try {
    const res = await fetch(`https://www.omdbapi.com/?${omdbParams.toString()}`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    const data = await res.json();

    if (data.Response === "False") {
      return NextResponse.json({ configured: true, found: false });
    }

    const ratings = Object.fromEntries(
      (data.Ratings ?? []).map((r) => [r.Source, r.Value])
    );

    return NextResponse.json({
      configured: true,
      found: true,
      title: data.Title,
      imdbRating: data.imdbRating !== "N/A" ? data.imdbRating : null,
      imdbVotes: data.imdbVotes !== "N/A" ? data.imdbVotes : null,
      imdbId: data.imdbID,
      rottenTomatoes: ratings["Rotten Tomatoes"] ?? null,
      metacritic: data.Metascore !== "N/A" ? data.Metascore : null,
      rated: data.Rated !== "N/A" ? data.Rated : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to reach OMDb", detail: error.message },
      { status: 502 }
    );
  }
}
