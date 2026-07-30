"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import Link from "next/link";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  SkipBack,
  SkipForward,
  Subtitles,
  Languages,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";

const WORKER_BASE =
  process.env.NEXT_PUBLIC_HLS_WORKER_BASE_URL || "https://r2-video-worker.ayush201.workers.dev";

// The Cloudflare Worker + R2 bucket only host a single demo asset today
// ("testvideo"), so every title plays that same stream — the id is used for
// navigation/metadata, not for picking a different file on the backend.
const STREAM_KEY = "testvideo";

const qualityOptions = [
  { label: "Auto", value: "auto" },
  { label: "1080p", value: "1080p" },
  { label: "720p", value: "720p" },
  { label: "480p", value: "480p" },
];

export default function NetflixPlayer({ title = "Bayflix", subtitle = "", backHref = "/browse" }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const progressBarRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentQuality, setCurrentQuality] = useState("auto");
  const [actualQuality, setActualQuality] = useState("1080p");
  const [audioTracks, setAudioTracks] = useState([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState(0);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1);
  const [networkCondition, setNetworkCondition] = useState("good");

  const getVideoUrl = (quality) =>
    quality === "auto"
      ? `${WORKER_BASE}/${STREAM_KEY}/master.m3u8`
      : `${WORKER_BASE}/${STREAM_KEY}/${quality}.m3u8`;

  const findLevelByQuality = useCallback((levels, targetQuality) => {
    if (!levels || levels.length === 0) return -1;
    const sorted = levels
      .map((level, index) => ({ ...level, originalIndex: index }))
      .sort((a, b) => (b.height || 0) - (a.height || 0));

    switch (targetQuality) {
      case "1080p":
        return sorted.find((l) => (l.height || 0) >= 1080)?.originalIndex ?? sorted[0]?.originalIndex ?? -1;
      case "720p":
        return (
          sorted.find((l) => (l.height || 0) >= 720 && (l.height || 0) < 1080)?.originalIndex ??
          sorted.find((l) => (l.height || 0) >= 720)?.originalIndex ??
          sorted[0]?.originalIndex ??
          -1
        );
      case "480p":
        return (
          sorted.find((l) => (l.height || 0) >= 480 && (l.height || 0) < 720)?.originalIndex ??
          sorted.find((l) => (l.height || 0) >= 480)?.originalIndex ??
          sorted[sorted.length - 1]?.originalIndex ??
          -1
        );
      default:
        return -1;
    }
  }, []);

  const monitorNetworkConditions = useCallback(() => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video || !hls) return;

    const buffered = video.buffered;
    if (buffered.length > 0) {
      const bufferAhead = buffered.end(buffered.length - 1) - video.currentTime;
      setNetworkCondition(bufferAhead < 5 ? "poor" : bufferAhead < 15 ? "medium" : "good");
    }

    if (hls.levels && hls.currentLevel >= 0) {
      const level = hls.levels[hls.currentLevel];
      if (level) {
        setActualQuality(level.height >= 1080 ? "1080p" : level.height >= 720 ? "720p" : "480p");
      }
    }
  }, []);

  const initializeVideo = useCallback(
    (quality, resumeTime = 0) => {
      const video = videoRef.current;
      const videoSrc = getVideoUrl(quality);
      if (!video) return;

      const wasPlaying = !video.paused;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      setIsLoading(true);
      setError(null);

      if (video.canPlayType("application/vnd.apple.mpegurl") && quality !== "auto") {
        video.src = videoSrc;
        video.addEventListener(
          "loadedmetadata",
          () => {
            if (resumeTime > 0) video.currentTime = resumeTime;
            if (wasPlaying) video.play();
            setIsLoading(false);
          },
          { once: true }
        );
        return;
      }

      if (!Hls.isSupported()) {
        setError("HLS playback is not supported in this browser.");
        setIsLoading(false);
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        backBufferLength: 30,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        capLevelToPlayerSize: quality === "auto",
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        if (quality !== "auto") {
          const targetLevel = findLevelByQuality(data.levels, quality);
          if (targetLevel >= 0) {
            hls.loadLevel = targetLevel;
            hls.currentLevel = targetLevel;
          }
        } else {
          hls.currentLevel = -1;
        }

        if (resumeTime > 0) video.currentTime = resumeTime;
        if (wasPlaying) video.play();
        setIsLoading(false);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const level = hls.levels[data.level];
        if (level) {
          setActualQuality(level.height >= 1080 ? "1080p" : level.height >= 720 ? "720p" : "480p");
        }
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event, data) => setAudioTracks(data.audioTracks));
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_event, data) => setCurrentAudioTrack(data.id));
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_event, data) => setSubtitleTracks(data.subtitleTracks));

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            setError("Network error — please check your connection.");
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            setError("Playback error — attempting to recover…");
            hls.recoverMediaError();
            break;
          default:
            setError(`Failed to load ${quality} quality.`);
        }
        setIsLoading(false);
      });

      hls.on(Hls.Events.BUFFER_APPENDED, monitorNetworkConditions);

      hls.loadSource(videoSrc);
      hls.attachMedia(video);
    },
    [findLevelByQuality, monitorNetworkConditions]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    initializeVideo(currentQuality);

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      monitorNetworkConditions();
    };
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handleLoadedMetadata = () => setIsLoading(false);
    const handleContextMenu = (e) => e.preventDefault();

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("contextmenu", handleContextMenu);
    video.disablePictureInPicture = true;

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("contextmenu", handleContextMenu);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuality]);

  useEffect(() => {
    if (!isPlaying || showSettings) return;
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(controlsTimeoutRef.current);
  }, [isPlaying, showControls, showSettings]);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!document.fullscreenElement) await container.requestFullscreen();
    else await document.exitFullscreen();
  }, []);

  const skipTime = useCallback((seconds) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
  }, [duration]);

  const handleVolumeChange = useCallback((newVolume) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    const handleKeyPress = (e) => {
      if (e.target !== document.body) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === "KeyF") {
        toggleFullscreen();
      } else if (e.code === "ArrowLeft") {
        skipTime(-10);
      } else if (e.code === "ArrowRight") {
        skipTime(10);
      } else if (e.code === "KeyM") {
        toggleMute();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [togglePlayPause, toggleFullscreen, skipTime, toggleMute]);

  const handleSeek = (e) => {
    const video = videoRef.current;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * duration;
  };

  const changeQuality = (newQuality) => {
    if (newQuality === currentQuality) return;
    const resumeTime = videoRef.current?.currentTime ?? 0;
    setCurrentQuality(newQuality);
    setShowSettings(false);
    initializeVideo(newQuality, resumeTime);
  };

  const changeAudioTrack = (trackId) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
      setCurrentAudioTrack(trackId);
      setShowSettings(false);
    }
  };

  const changeSubtitleTrack = (trackId) => {
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = trackId;
      setCurrentSubtitleTrack(trackId);
      setShowSettings(false);
    }
  };

  const formatTime = (time) => {
    if (!Number.isFinite(time)) return "0:00";
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const qualityLabel = currentQuality === "auto" ? `Auto (${actualQuality})` : currentQuality;

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden bg-black"
      style={{ cursor: showControls ? "default" : isPlaying ? "none" : "default" }}
      onMouseMove={() => setShowControls(true)}
      onClick={() => setShowSettings(false)}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        onClick={togglePlayPause}
        onDoubleClick={toggleFullscreen}
        controls={false}
        disablePictureInPicture
        preload="metadata"
      />

      {(isLoading || isBuffering) && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/70">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
          <p className="text-2xl font-bold">Playback error</p>
          <p className="max-w-md text-neutral-400">{error}</p>
          <button
            onClick={() => initializeVideo(currentQuality)}
            className="flex items-center gap-2 rounded bg-brand px-6 py-3 font-semibold transition hover:bg-brand-dark"
          >
            <RotateCcw size={18} /> Retry
          </button>
        </div>
      )}

      {!isPlaying && !isLoading && !error && (
        <button
          onClick={togglePlayPause}
          className="absolute inset-0 z-[100] flex items-center justify-center"
          aria-label="Play"
        >
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-black/60 transition hover:scale-105 hover:bg-black/80">
            <Play size={48} fill="white" className="ml-1" />
          </span>
        </button>
      )}

      <div
        className="absolute inset-0 z-[200] bg-gradient-to-t from-black/80 via-transparent to-black/80 transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? "auto" : "none" }}
      >
        <div className="flex items-start justify-between p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10"
              aria-label="Back"
            >
              <ArrowLeft size={22} />
            </Link>
            <div>
              <h1 className="text-lg font-bold sm:text-2xl">{title}</h1>
              {subtitle && <p className="text-xs text-neutral-300 sm:text-sm">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md bg-black/80 px-3 py-1.5 text-xs font-semibold">
            <span
              className={`h-2 w-2 rounded-full ${
                networkCondition === "good" ? "bg-green-500" : networkCondition === "medium" ? "bg-amber-500" : "bg-red-500"
              }`}
            />
            {qualityLabel}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <div
            ref={progressBarRef}
            onClick={handleSeek}
            className="group/bar mb-4 h-1 w-full cursor-pointer rounded bg-white/30"
          >
            <div
              className="relative h-full rounded bg-brand transition-[height] group-hover/bar:h-1.5"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
            >
              <span className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-brand opacity-0 group-hover/bar:opacity-100" />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-y-2">
            <div className="flex items-center gap-3 sm:gap-4">
              <button onClick={togglePlayPause} className="text-white" title="Play/Pause (Space)">
                {isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" />}
              </button>
              <button onClick={() => skipTime(-10)} className="text-white" title="Rewind 10s">
                <SkipBack size={20} />
              </button>
              <button onClick={() => skipTime(10)} className="text-white" title="Forward 10s">
                <SkipForward size={20} />
              </button>

              <div className="group/vol flex items-center gap-2">
                <button onClick={toggleMute} className="text-white" title="Mute (M)">
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-0 accent-brand transition-all group-hover/vol:w-20"
                />
              </div>

              <span className="hidden text-xs text-neutral-300 sm:inline">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings(showSettings === "subtitles" ? false : "subtitles");
                }}
                className="text-white"
                title="Subtitles"
              >
                <Subtitles size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings(showSettings === "audio" ? false : "audio");
                }}
                className="text-white"
                title="Audio"
              >
                <Languages size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings(showSettings === "quality" ? false : "quality");
                }}
                className="text-white"
                title="Quality"
              >
                <Settings size={20} />
              </button>
              <button onClick={toggleFullscreen} className="text-white" title="Fullscreen (F)">
                <Maximize size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSettings && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-20 right-4 z-[300] w-56 rounded-md border border-white/10 bg-black/95 p-4 backdrop-blur sm:right-6"
        >
          {showSettings === "quality" && (
            <SettingsList
              heading="Video Quality"
              options={qualityOptions.map((q) => ({ id: q.value, label: q.label }))}
              activeId={currentQuality}
              onSelect={changeQuality}
            />
          )}
          {showSettings === "audio" && (
            <SettingsList
              heading="Audio Track"
              options={audioTracks.map((t, i) => ({ id: t.id, label: t.name || t.lang || `Track ${i + 1}` }))}
              activeId={currentAudioTrack}
              onSelect={changeAudioTrack}
              emptyLabel="No audio tracks available"
            />
          )}
          {showSettings === "subtitles" && (
            <SettingsList
              heading="Subtitles"
              options={[
                { id: -1, label: "Off" },
                ...subtitleTracks.map((t, i) => ({ id: t.id, label: t.name || t.lang || `Subtitle ${i + 1}` })),
              ]}
              activeId={currentSubtitleTrack}
              onSelect={changeSubtitleTrack}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SettingsList({ heading, options, activeId, onSelect, emptyLabel }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-white">{heading}</h3>
      {options.length === 0 ? (
        <p className="text-sm text-neutral-500">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`rounded px-3 py-2 text-left text-sm transition ${
                activeId === opt.id ? "bg-brand text-white" : "text-neutral-300 hover:bg-white/10"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
