"use client";

import { useEffect, useRef } from "react";

interface YTPlayer {
  mute(): void;
  unMute(): void;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
  getIframe(): HTMLIFrameElement;
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

function applyCoverStyle(iframe: HTMLIFrameElement) {
  Object.assign(iframe.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "100vw",
    height: "56.25vw",
    minHeight: "100%",
    minWidth: "177.78vh",
    transform: "translate(-50%, -50%)",
    border: "0",
    pointerEvents: "none",
  });
}

interface YouTubeLivePlayerProps {
  videoId: string;
  muted: boolean;
  /** Defaults to true. Set false to pause — e.g. while scrolled out of view. */
  playing?: boolean;
}

// Uses the real YouTube IFrame Player API for genuinely live mute/unmute
// (player.mute()/unMute() on the already-playing instance, no reload).
// ONLY use this where the component mounts once and stays mounted — the
// API's internal postMessage heartbeat doesn't tear down cleanly under
// rapid mount/unmount churn (confirmed: it threw postMessage/DOMWindow
// errors when used for the hover-triggered card PIP, which creates and
// destroys a player on every hover in/out). Hero and the detail-page hero
// trailer mount once per page view, so that risk doesn't apply here — for
// anything hover-triggered, use the plain-iframe YouTubeBackground instead.
export default function YouTubeLivePlayer({ videoId, muted, playing = true }: YouTubeLivePlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const mutedRef = useRef(muted);
  const playingRef = useRef(playing);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;

    // Mount target is a plain DOM node created and owned imperatively,
    // inside a wrapper React renders but never looks inside — the API
    // replaces whatever element you hand its constructor with its own
    // <iframe>, and pointing it at a node React itself tracks via ref
    // desyncs React's reconciliation the next time this re-renders.
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
            // autoplay:1 above means the player starts playing on its own the
            // moment it's ready, regardless of the current `playing` prop —
            // if it became ready while already out of view (mid-scroll, or a
            // restored scroll position on back-navigation), nothing else
            // stops it. Explicitly pausing here closes that gap.
            if (playingRef.current) e.target.playVideo();
            else e.target.pauseVideo();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      readyRef.current = false;
      playerRef.current?.destroy();
      playerRef.current = null;
      mountEl.remove();
    };
  }, [videoId]);

  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    if (muted) playerRef.current.mute();
    else playerRef.current.unMute();
  }, [muted]);

  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    if (playing) playerRef.current.playVideo();
    else playerRef.current.pauseVideo();
  }, [playing]);

  return <div ref={wrapperRef} className="absolute inset-0 overflow-hidden" />;
}
