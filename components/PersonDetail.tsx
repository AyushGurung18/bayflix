"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { User } from "lucide-react";
import { SkeletonDetail } from "./Skeletons";
import MovieRow from "./MovieRow";
import TrailerModal from "./TrailerModal";
import { useTrailer } from "@/lib/use-trailer";
import { posterUrl, fetchPersonDetails } from "@/lib/tmdb";
import { BLUR_DATA_URL } from "@/lib/image-utils";
import type { TmdbCombinedCreditItem, TmdbPerson } from "@/lib/types";

function formatDate(date?: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function calculateAge(birthday?: string | null, deathday?: string | null) {
  if (!birthday) return null;
  const end = deathday ? new Date(deathday) : new Date();
  const start = new Date(birthday);
  let age = end.getFullYear() - start.getFullYear();
  const m = end.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < start.getDate())) age--;
  return age;
}

interface PersonDetailProps {
  id: string;
}

export default function PersonDetail({ id }: PersonDetailProps) {
  const [data, setData] = useState<TmdbPerson | null>(null);
  const [notFound, setNotFound] = useState(false);
  const { trailer, openTrailer, closeTrailer } = useTrailer();

  useEffect(() => {
    let cancelled = false;
    fetchPersonDetails(id)
      .then((details) => {
        if (cancelled) return;
        if (details?.success === false) setNotFound(true);
        else setData(details);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (notFound) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-neutral-400">
        We couldn&rsquo;t find that person.
      </div>
    );
  }
  if (!data) return <SkeletonDetail />;

  const credits: TmdbCombinedCreditItem[] = data.combined_credits?.cast ?? [];
  const seen = new Set<string>();
  const filmography = credits
    .filter((c) => (c.poster_path || c.backdrop_path) && (c.media_type === "movie" || c.media_type === "tv"))
    .filter((c) => {
      const key = `${c.media_type}-${c.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

  const age = calculateAge(data.birthday, data.deathday);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-10 sm:pt-32">
      <div className="flex flex-col gap-8 sm:flex-row">
        <div className="relative mx-auto h-56 w-56 shrink-0 overflow-hidden rounded-full bg-ink-card shadow-2xl sm:mx-0">
          {data.profile_path ? (
            <Image
              src={posterUrl(data.profile_path, "w500") ?? ""}
              alt={data.name}
              fill
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-600">
              <User size={64} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-black sm:text-4xl">{data.name}</h1>
          {data.known_for_department && (
            <p className="mt-1 text-sm font-semibold text-brand">{data.known_for_department}</p>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm sm:justify-start">
            {data.birthday && (
              <div>
                <p className="text-neutral-500">{data.deathday ? "Born" : "Birthday"}</p>
                <p className="text-neutral-200">
                  {formatDate(data.birthday)}
                  {age !== null && !data.deathday ? ` (age ${age})` : ""}
                </p>
              </div>
            )}
            {data.deathday && (
              <div>
                <p className="text-neutral-500">Died</p>
                <p className="text-neutral-200">
                  {formatDate(data.deathday)}
                  {age !== null ? ` (age ${age})` : ""}
                </p>
              </div>
            )}
            {data.place_of_birth && (
              <div>
                <p className="text-neutral-500">Place of Birth</p>
                <p className="text-neutral-200">{data.place_of_birth}</p>
              </div>
            )}
          </div>

          {data.biography && (
            <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-neutral-300 sm:text-base">
              {data.biography}
            </p>
          )}
        </div>
      </div>

      {filmography.length > 0 && (
        <div className="mt-10 -mx-4 sm:-mx-10">
          <MovieRow title="Known For" items={filmography} onTrailer={openTrailer} />
        </div>
      )}

      <TrailerModal videoKey={trailer?.key} title={trailer?.title} onClose={closeTrailer} />
    </div>
  );
}
