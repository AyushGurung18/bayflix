import { NextResponse, type NextRequest } from "next/server";

const TMDB_BASE_URL = process.env.TMDB_BASE_URL || "https://api.themoviedb.org";

// Proxies TMDB's v3 API so the API key stays on the server — the old app
// shipped REACT_APP_BASE_KEY straight to the browser in every fetch call.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TMDB_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  const { path } = await params;
  const endpoint = Array.isArray(path) ? path.join("/") : path;

  const incoming = new URL(request.url);
  const search = new URLSearchParams(incoming.search);
  search.set("api_key", apiKey);

  const tmdbUrl = `${TMDB_BASE_URL}/3/${endpoint}?${search.toString()}`;

  try {
    const res = await fetch(tmdbUrl, { next: { revalidate: 60 * 30 } });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to reach TMDB", detail: (error as Error).message },
      { status: 502 }
    );
  }
}
