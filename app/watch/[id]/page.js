"use client";

import { Suspense, use, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import NetflixPlayer from "@/components/NetflixPlayer";
import { fetchMovieDetails, fetchTVDetails } from "@/lib/tmdb";
import { useWatchStatus } from "@/lib/watch-status-context";

function WatchPageContent({ id }) {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";
  const titleFromQuery = searchParams.get("title");
  const { markWatched } = useWatchStatus();
  const recorded = useRef(false);

  const [meta, setMeta] = useState(null);

  useEffect(() => {
    const fetcher = type === "tv" ? fetchTVDetails : fetchMovieDetails;
    fetcher(id)
      .then((data) => setMeta(data))
      .catch(() => setMeta(null));
  }, [id, type]);

  useEffect(() => {
    if (!meta || recorded.current) return;
    recorded.current = true;
    // Recording a play as "watched" (rather than requiring a manual button)
    // is what actually feeds the recommendations engine real signal.
    markWatched(meta, type);
  }, [meta, type, markWatched]);

  const title = titleFromQuery || meta?.title || meta?.name || "Bayflix";
  const date = meta?.release_date || meta?.first_air_date;
  const subtitle = [type === "tv" ? "Series" : "Movie", date?.slice(0, 4), "HD"]
    .filter(Boolean)
    .join(" • ");

  return (
    <NetflixPlayer
      title={title}
      subtitle={subtitle}
      backHref={type === "tv" ? `/tv/${id}` : `/movie/${id}`}
    />
  );
}

export default function WatchPage({ params }) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <WatchPageContent id={id} />
    </Suspense>
  );
}
