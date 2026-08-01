"use client";

import { useEffect, useRef } from "react";

interface YTPlayer {
  mute(): void;
  unMute(): void;
  playVideo(): void;
  destroy(): void;
  getIframe(): HTMLIFrameElement;
}

interface YTPlayerEvent {
  target: YTPlayer;
}

interface YTPlayerErrorEvent {
  data: number;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars: Record<string, string | number>;
          events: {
            onReady: (e: YTPlayerEvent) => void;
            onError: (e: YTPlayerErrorEvent) => void;
          };
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

// Forces the iframe to cover its container regardless of aspect ratio,
// applied as inline styles (highest possible specificity — no cascade/load
// order to get wrong) instead of relying on an external stylesheet rule.
function applyCoverStyle(iframe: HTMLIFrameElement) {
  Object.assign(iframe.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "100vw",
    height: "56.25vw", // 16:9
    minHeight: "100%",
    minWidth: "177.78vh", // 16:9, inverted
    transform: "translate(-50%, -50%)",
    border: "0",
    pointerEvents: "none",
  });
}

interface YouTubeBackgroundProps {
  videoId: string;
  muted: boolean;
  className?: string;
  /** Some trailers have embedding disabled by the uploader — YouTube then
   * renders its own "watch on YouTube" fallback card *inside* the iframe
   * (title/channel bar, suggested-video thumbnail, YouTube logo), which is
   * cross-origin content no amount of our CSS can reach in and strip. The
   * only correct handling is detecting that and having the caller fall back
   * to a plain backdrop image instead of showing a broken embed. */
  onUnavailable?: () => void;
}

// Renders trailers via the real YouTube IFrame Player API instead of a raw
// embed URL, mainly so mute/unmute is a genuine player.mute()/unMute() call
// on the already-playing instance — toggling a `mute=` query param instead
// forces a reload, which browsers' autoplay policy frequently re-blocks.
//
// The API replaces whatever element you hand its constructor with its own
// <iframe> — if that element is one React itself renders and tracks (e.g.
// the ref target of the JSX below), React's next reconcile of THIS
// component (or its cleanup on unmount) tries to operate on a DOM node
// YouTube already tore out from under it. So the mount target here is a
// plain DOM node created and owned imperatively, inside a wrapper React
// renders but never looks inside.
export default function YouTubeBackground({ videoId, muted, className, onUnavailable }: YouTubeBackgroundProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const mutedRef = useRef(muted);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;

    const mountEl = document.createElement("div");
    mountEl.style.width = "100%";
    mountEl.style.height = "100%";
    wrapperRef.current?.appendChild(mountEl);

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT) return;
      playerRef.current = new window.YT.Player(mountEl, {
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
            applyCoverStyle(e.target.getIframe());
            if (!mutedRef.current) e.target.unMute();
            e.target.playVideo();
          },
          onError: (e) => {
            // 101/150 = embedding disabled by the uploader, 100 = video
            // removed/private — genuinely unplayable, not a transient blip.
            console.warn(`YouTube embed error (videoId=${videoId}): code ${e.data}`);
            if (!cancelled) onUnavailable?.();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      readyRef.current = false;
      playerRef.current?.destroy();
      playerRef.current = null;
      mountEl.remove(); // no-op if the player already replaced/removed it
    };
    // onUnavailable is a per-render callback prop; re-subscribing to it on
    // every change would tear down and recreate the player pointlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    if (muted) playerRef.current.mute();
    else playerRef.current.unMute();
  }, [muted]);

  return <div ref={wrapperRef} className={className} />;
}
