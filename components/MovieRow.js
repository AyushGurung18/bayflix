"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard from "./MovieCard";

export default function MovieRow({ title, items, mediaType, exploreHref, onTrailer }) {
  const scrollerRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  if (!items || items.length === 0) return null;

  const updateEdges = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  const scroll = (direction) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
    setTimeout(updateEdges, 400);
  };

  return (
    <section className="relative py-4">
      <div className="mb-2 flex items-center justify-between px-4 sm:px-10">
        <h2 className="text-lg font-semibold text-neutral-100 sm:text-xl">{title}</h2>
        {exploreHref && (
          <Link
            href={exploreHref}
            className="text-sm font-medium text-neutral-400 transition hover:text-white"
          >
            Explore All
          </Link>
        )}
      </div>

      <div className="group/row relative">
        {!atStart && (
          <button
            onClick={() => scroll(-1)}
            aria-label="Scroll left"
            className="absolute left-0 top-0 z-10 hidden h-full w-10 items-center justify-center bg-gradient-to-r from-ink/90 to-transparent text-white opacity-0 transition group-hover/row:opacity-100 sm:flex"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        <div
          ref={scrollerRef}
          onScroll={updateEdges}
          className="no-scrollbar flex gap-2 overflow-x-auto overflow-y-visible scroll-smooth px-4 pb-4 sm:gap-3 sm:px-10"
          style={{ overflowY: "visible" }}
        >
          {items.map((item, i) => (
            <MovieCard
              key={item.id}
              item={item}
              mediaType={mediaType || item.media_type}
              onTrailer={onTrailer}
              priority={i < 4}
            />
          ))}
        </div>

        {!atEnd && (
          <button
            onClick={() => scroll(1)}
            aria-label="Scroll right"
            className="absolute right-0 top-0 z-10 hidden h-full w-10 items-center justify-center bg-gradient-to-l from-ink/90 to-transparent text-white opacity-0 transition group-hover/row:opacity-100 sm:flex"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </section>
  );
}
