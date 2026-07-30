"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Info, Film, Star } from "lucide-react";
import { posterUrl } from "@/lib/tmdb";

export default function MovieCard({ item, mediaType, onTrailer, priority = false }) {
  if (!item?.poster_path && !item?.backdrop_path) return null;

  const type = mediaType || item.media_type || "movie";
  const title = item.title || item.name || "Untitled";
  const date = item.release_date || item.first_air_date;
  const year = date ? date.slice(0, 4) : null;
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const infoHref = type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`;

  return (
    <div className="group/card relative w-[150px] shrink-0 sm:w-[190px]">
      <Link href={infoHref} className="block overflow-hidden rounded-md bg-ink-card shadow-lg">
        <div className="relative aspect-[2/3] w-full transition-transform duration-300 ease-out group-hover/card:scale-105">
          {item.poster_path ? (
            <Image
              src={posterUrl(item.poster_path, "w342")}
              alt={title}
              fill
              priority={priority}
              sizes="(max-width: 640px) 150px, 190px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-ink-card text-neutral-600">
              <Film size={32} />
            </div>
          )}
        </div>
      </Link>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 origin-top scale-95 rounded-md bg-ink-raised opacity-0 shadow-2xl transition-all duration-150 group-hover/card:pointer-events-auto group-hover/card:scale-100 group-hover/card:opacity-100">
        <Link href={infoHref} className="relative block aspect-[2/3] w-full overflow-hidden rounded-t-md">
          {item.poster_path ? (
            <Image
              src={posterUrl(item.poster_path, "w342")}
              alt={title}
              fill
              sizes="(max-width: 640px) 150px, 190px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-ink-card text-neutral-600">
              <Film size={32} />
            </div>
          )}
        </Link>
        <div className="p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Link
              href={`/watch/${item.id}?type=${type}&title=${encodeURIComponent(title)}`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/80"
              aria-label={`Play ${title}`}
            >
              <Play size={15} fill="black" className="ml-0.5" />
            </Link>
            <button
              onClick={() => onTrailer?.(item, type)}
              className="flex h-8 items-center gap-1 rounded-full border border-neutral-500 px-2.5 text-xs font-semibold text-white transition hover:border-white"
            >
              Trailer
            </button>
            <Link
              href={infoHref}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-neutral-500 text-white transition hover:border-white"
              aria-label="More info"
            >
              <Info size={15} />
            </Link>
          </div>
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
            {rating && (
              <span className="flex items-center gap-0.5 text-green-400">
                <Star size={11} fill="currentColor" /> {rating}
              </span>
            )}
            {year && <span>{year}</span>}
            <span className="rounded border border-neutral-500 px-1 text-[10px] uppercase">
              {type === "tv" ? "Series" : "Movie"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
