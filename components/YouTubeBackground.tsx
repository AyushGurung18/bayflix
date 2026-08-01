"use client";

import { useEffect, useRef } from "react";

interface YTPlayer {
  mute(): void;
  unMute(): void;
  playVideo(): void;
  destroy(): void;
}

interface YTPlayerEvent {
  target: YTPlayer;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars: Record<string, string | number>;
          events: { onReady: (e: YTPlayerEvent) => void };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiPromise;
}

interface YouTubeBackgroundProps {
  videoId: string;
  muted: boolean;
  className?: string;
}

// Renders trailers via the real YouTube IFrame Player API instead of a raw
// embed URL. Two things this fixes that URL params alone can't:
//   1. Mute/unmute becomes a genuine player.mute()/unMute() call on the
//      already-playing instance — toggling a `mute=` query param instead
//      forces a reload, which browsers' autoplay policy frequently
//      re-blocks (unmuted autoplay isn't allowed without a direct gesture
//      on that exact reload), so the button visually did nothing.
//   2. Paired with the .yt-cover-frame CSS class, the iframe it creates
//      gets sized to always cover its container instead of YouTube's own
//      player letterboxing itself inside a non-16:9 box.
export default function YouTubeBackground({ videoId, muted, className }: YouTubeBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const mutedRef = useRef(muted);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !mountRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(mountRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          mute: 1, // always start muted — required for autoplay to reliably work at all
          controls: 0,
          loop: 1,
          playlist: videoId,
          rel: 0,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
          playsinline: 1,
          modestbranding: 1,
        },
        events: {
          onReady: (e) => {
            if (cancelled) return;
            readyRef.current = true;
            if (!mutedRef.current) e.target.unMute();
            e.target.playVideo();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    if (muted) playerRef.current.mute();
    else playerRef.current.unMute();
  }, [muted]);

  return <div ref={mountRef} className={className} />;
}
