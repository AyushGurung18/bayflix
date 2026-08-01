"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

// Inertial smooth-scrolling for the whole app — this alone is a big chunk of
// what makes a site feel "premium" rather than default-browser-scroll flat.
export default function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.7, // was 1.05 — read as laggy, this is snappier while still inertial
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    let frameId: number;
    function raf(time: number) {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    }
    frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Lenis tracks its own virtual scroll position independently of the
    // browser's native one — Next's router resets the latter on navigation,
    // but not Lenis's, which is why a page kept opening already scrolled
    // down. Force it back to the top on every route change.
    lenisRef.current?.scrollTo(0, { immediate: true });
  }, [pathname]);

  return null;
}
