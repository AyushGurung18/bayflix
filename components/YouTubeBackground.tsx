"use client";

interface YouTubeBackgroundProps {
  videoId: string;
  muted: boolean;
}

// A plain declarative embed — no JS Player API. That API's internal
// postMessage heartbeat proved unstable under the mount/unmount churn a
// hover-triggered preview creates (players getting destroyed and recreated
// on every hover in/out): it started throwing
// "Failed to execute 'postMessage' on 'DOMWindow'" errors and leaving the
// preview broken instead of playing. A raw iframe has no persistent
// JS-managed lifecycle — removing it from the DOM fully and immediately
// stops everything, nothing left running to leak or desync.
//
// Trade-off: toggling mute remounts the iframe (via the `muted` key below)
// instead of calling player.mute() live, so there's a brief reload. Far
// preferable to the alternative actually crashing.
export default function YouTubeBackground({ videoId, muted }: YouTubeBackgroundProps) {
  return (
    <iframe
      key={videoId + muted}
      title="Trailer"
      src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=${
        muted ? 1 : 0
      }&controls=0&loop=1&playlist=${videoId}&rel=0&iv_load_policy=3&fs=0&disablekb=1&playsinline=1&modestbranding=1`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      className="yt-cover"
    />
  );
}
