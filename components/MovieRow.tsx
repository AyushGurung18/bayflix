"use client";

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard from "./MovieCard";
import type { MediaType, TmdbItem } from "@/lib/types";

const rowVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

interface MovieRowProps {
  title: string;
  items: TmdbItem[];
  mediaType?: MediaType;
  exploreHref?: string;
  onTrailer?: (item: TmdbItem, mediaType: MediaType) => void;
}

export default function MovieRow({ title, items, mediaType, exploreHref, onTrailer }: MovieRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Mouse-drag-to-scroll state — touch already gets native horizontal
  // scrolling from overflow-x-auto, so this only engages for mouse pointers.
  const dragRef = useRef({ dragging: false, startX: 0, startScrollLeft: 0, moved: false });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // Wheel needs a real (non-passive) listener to preventDefault — React's
    // onWheel can't reliably stop the page from also scrolling vertically.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const handleMove = (e: globalThis.PointerEvent) => {
      const state = dragRef.current;
      if (!state.dragging) return;
      const el = scrollerRef.current;
      if (!el) return;
      const dx = e.clientX - state.startX;
      if (Math.abs(dx) > 5) state.moved = true;
      el.scrollLeft = state.startScrollLeft - dx;
    };
    const handleUp = () => {
      dragRef.current.dragging = false;
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  if (!items || items.length === 0) return null;

  const updateEdges = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  const scroll = (direction: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
    setTimeout(updateEdges, 400);
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = { dragging: true, startX: e.clientX, startScrollLeft: el.scrollLeft, moved: false };
  };

  // A drag that actually moved the row shouldn't also register as a click on
  // whatever card the pointer happened to land on.
  const handleClickCapture = (e: MouseEvent) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4 }}
      className="relative py-4"
    >
      <div className="mb-2 flex items-center justify-between px-4 sm:px-10">
        <h2 className="text-lg font-semibold text-neutral-100 sm:text-xl">{title}</h2>
        {exploreHref && (
          <Link
            href={exploreHref}
            className="group/link flex items-center gap-1 text-sm font-medium text-neutral-400 transition hover:text-white"
          >
            Explore All
            <ChevronRight size={14} className="transition group-hover/link:translate-x-0.5" />
          </Link>
        )}
      </div>

      <div className="group/row relative">
        {!atStart && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => scroll(-1)}
            aria-label="Scroll left"
            className="absolute left-0 top-0 z-10 hidden h-full w-10 items-center justify-center bg-gradient-to-r from-ink/90 to-transparent text-white opacity-0 transition group-hover/row:opacity-100 sm:flex"
          >
            <ChevronLeft size={28} />
          </motion.button>
        )}

        <motion.div
          ref={scrollerRef}
          onScroll={updateEdges}
          onPointerDown={handlePointerDown}
          onClickCapture={handleClickCapture}
          variants={rowVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="no-scrollbar flex cursor-grab select-none gap-2 overflow-x-auto overflow-y-visible scroll-smooth px-4 pb-4 active:cursor-grabbing sm:gap-3 sm:px-10"
          style={{ overflowY: "visible" }}
        >
          {items.map((item, i) => (
            <motion.div key={item.id} variants={cardVariants}>
              <MovieCard
                item={item}
                mediaType={mediaType || item.media_type}
                onTrailer={onTrailer}
                priority={i < 4}
              />
            </motion.div>
          ))}
        </motion.div>

        {!atEnd && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => scroll(1)}
            aria-label="Scroll right"
            className="absolute right-0 top-0 z-10 hidden h-full w-10 items-center justify-center bg-gradient-to-l from-ink/90 to-transparent text-white opacity-0 transition group-hover/row:opacity-100 sm:flex"
          >
            <ChevronRight size={28} />
          </motion.button>
        )}
      </div>
    </motion.section>
  );
}
