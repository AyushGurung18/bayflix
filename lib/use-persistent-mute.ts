"use client";

import { useEffect, useState } from "react";

const KEY = "bayflix:trailer-muted";

/** Trailer mute preference, shared across every preview on the site instead
 * of defaulting back to muted on every single card/hero. */
export function usePersistentMute(defaultValue = true): [boolean, () => void] {
  const [muted, setMuted] = useState(defaultValue);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    // Hydrating from an external source (localStorage) on mount, not
    // mirroring anything derivable from props/state at render time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored !== null) setMuted(stored === "1");
  }, []);

  const toggle = () => {
    setMuted((current) => {
      const next = !current;
      localStorage.setItem(KEY, next ? "1" : "0");
      return next;
    });
  };

  return [muted, toggle];
}
