"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import MovieCard from "@/components/MovieCard";
import TrailerModal from "@/components/TrailerModal";
import { SkeletonGrid } from "@/components/Skeletons";
import { useTrailer } from "@/lib/use-trailer";
import { CATEGORIES } from "@/lib/tmdb";

function MediaSection({ title, mediaType, fetcher }) {
  const [items, setItems] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { trailer, openTrailer, closeTrailer } = useTrailer();

  useEffect(() => {
    let cancelled = false;
    fetcher(page).then((data) => {
      if (cancelled) return;
      setTotalPages(data.total_pages ?? 1);
      setItems((prev) => {
        const list = data.results ?? [];
        return page === 1 ? list : [...(prev ?? []), ...list];
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (items === null) {
    return (
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold sm:text-2xl">{title}</h2>
        <SkeletonGrid />
      </section>
    );
  }

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold sm:text-2xl">{title}</h2>
      <div className="flex flex-wrap gap-3 sm:gap-4">
        {items.map((item) => (
          <MovieCard key={item.id} item={item} mediaType={mediaType} onTrailer={openTrailer} />
        ))}
      </div>
      {page < totalPages && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="mt-6 rounded border border-neutral-500 px-5 py-2 text-sm font-medium text-neutral-200 transition hover:border-white hover:text-white"
        >
          Load more
        </button>
      )}
      <TrailerModal videoKey={trailer?.key} title={trailer?.title} onClose={closeTrailer} />
    </section>
  );
}

export default function CategoryPage({ params }) {
  const { slug } = use(params);
  const category = CATEGORIES[slug];

  if (!category) notFound();

  return (
    <div className="px-4 pb-16 pt-8 sm:px-10">
      <h1 className="mb-8 text-2xl font-bold sm:text-3xl">{category.label}</h1>
      <MediaSection title={`${category.label} Movies`} mediaType="movie" fetcher={category.movies} />
      <MediaSection title={`${category.label} Series`} mediaType="tv" fetcher={category.series} />
    </div>
  );
}
