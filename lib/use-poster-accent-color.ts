"use client";

import { useEffect, useState } from "react";

// Downsamples a poster/backdrop image into a tiny offscreen canvas and
// averages its pixels into one accent color — a cheap "dynamic theme
// color" (à la Spotify/Apple Music now-playing screens) usable as a CSS
// background-tint behind a detail page. TMDB's image CDN sends permissive
// CORS headers, so pixel reads work without a server round trip; if a
// browser/extension blocks it anyway (tainted canvas) we just fall back
// to null rather than throwing.
export function usePosterAccentColor(imageUrl?: string | null): string | null {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    // Resetting the tint when the poster itself changes (navigating to a
    // different title) — a deliberate response to that prop change, not
    // derivable from render-time values alone.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColor(null);
    if (!imageUrl) return;

    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 32) continue; // skip near-transparent pixels
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        if (count === 0 || cancelled) return;
        setColor(`rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`);
      } catch {
        // Tainted canvas (CORS blocked) or unsupported — no tint, not a crash.
      }
    };

    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return color;
}
