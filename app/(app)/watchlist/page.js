"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import MovieCard from "@/components/MovieCard";
import TrailerModal from "@/components/TrailerModal";
import { useTrailer } from "@/lib/use-trailer";
import { useWatchStatus } from "@/lib/watch-status-context";

export default function WatchlistPage() {
  const { configured, watchlist } = useWatchStatus();
  const { trailer, openTrailer, closeTrailer } = useTrailer();

  if (!configured) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center text-neutral-400">
        <Bookmark size={32} />
        <p className="max-w-sm">
          My List isn&rsquo;t connected yet — this needs the Bayflix API worker
          (Cloudflare D1 + Vectorize) deployed and configured.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-16 pt-8 sm:px-10">
      <h1 className="mb-8 text-2xl font-bold sm:text-3xl">My List</h1>

      {watchlist.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center text-neutral-400">
          <Bookmark size={32} />
          <p>Nothing here yet. Tap the + on any title to add it.</p>
          <Link href="/browse" className="text-sm font-semibold text-white underline underline-offset-4">
            Browse titles
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 sm:gap-4">
          {watchlist.map((item) => (
            <MovieCard
              key={`${item.media_type}:${item.id}`}
              item={item}
              mediaType={item.media_type}
              onTrailer={openTrailer}
            />
          ))}
        </div>
      )}

      <TrailerModal videoKey={trailer?.key} title={trailer?.title} onClose={closeTrailer} />
    </div>
  );
}
