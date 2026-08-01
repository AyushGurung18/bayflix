"use client";

import { usePathname } from "next/navigation";

// The vignette darkens screen edges for a "cinema" feel everywhere else, but
// on the immersive full-bleed video player it reads as black bars down the
// sides — exactly what it's supposed to avoid. Skip both ambient layers
// there so the player is truly edge-to-edge.
export default function AmbientEffects() {
  const pathname = usePathname();
  if (pathname?.startsWith("/watch")) return null;

  return (
    <>
      <div className="cinematic-vignette" />
      <div className="grain-overlay" />
    </>
  );
}
