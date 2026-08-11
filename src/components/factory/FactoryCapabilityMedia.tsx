import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Maximize2, Minimize2, MonitorUp, Pause, Play } from "lucide-react";

export const FACTORY_CAPABILITY_VIDEO_URL =
  "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/factory/irha-apparels-factory-capability-2026.mp4";
export const FACTORY_CAPABILITY_POSTER_URL =
  "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/factory/irha-apparels-factory-capability-poster.webp";
export const FACTORY_CAPABILITY_WATCH_PATH = "/factory-capability-video";
export const FACTORY_CAPABILITY_WATCH_URL = `https://irhaapparels.com${FACTORY_CAPABILITY_WATCH_PATH}`;
export const FACTORY_CAPABILITY_PUBLICATION_DATE = "2026-08-11";
export const FACTORY_CAPABILITY_DURATION = "PT1M15S";

export const FACTORY_CAPABILITY_TITLE = "Inside Irha Apparels — real factory capability overview";
export const FACTORY_CAPABILITY_DESCRIPTION =
  "A real prerecorded capability overview showing Irha Apparels manufacturing activity in Sialkot, including pattern preparation, fabric marking, cutting-table support, industrial lockstitch and overlock sewing, finishing support and buyer communication.";

type PlayerPreload = "none" | "metadata" | "auto";
type WebKitVideoElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitSupportsFullscreen?: boolean;
  webkitDisplayingFullscreen?: boolean;
};

export function FactoryCapabilityPlayer({
  className = "",
  preload = "none",
}: {
  className?: string;
  preload?: PlayerPreload;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!theaterMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTheaterMode(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [theaterMode]);

  const handlePlayPause = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) {
      video.pause();
      return;
    }

    try {
      if (video.readyState === HTMLMediaElement.HAVE_NOTHING) video.load();
      await video.play();
      setStatus("Factory video is playing.");
    } catch {
      setStatus("Playback could not start automatically. Use the native video Play control and try again.");
    }
  };

  const enterTheaterMode = () => {
    setTheaterMode(true);
    setStatus("Large theater view opened.");
  };

  const handleFullScreen = async () => {
    const shell = shellRef.current;
    const video = videoRef.current as WebKitVideoElement | null;
    if (!shell || !video) return;

    // iPhone/iOS Safari exposes a video-specific fullscreen API on versions
    // where element.requestFullscreen is unavailable or restricted.
    if (video.webkitSupportsFullscreen && typeof video.webkitEnterFullscreen === "function" && !document.fullscreenEnabled) {
      try {
        video.webkitEnterFullscreen();
        setStatus("Native iOS video fullscreen opened.");
        return;
      } catch {
        // Continue to standards fullscreen/theater fallback below.
      }
    }

    if (typeof shell.requestFullscreen === "function") {
      try {
        await shell.requestFullscreen();
        setStatus("Full screen opened.");
        return;
      } catch {
        // Continue to WebKit/theater fallback.
      }
    }

    if (typeof video.webkitEnterFullscreen === "function") {
      try {
        video.webkitEnterFullscreen();
        setStatus("Native WebKit video fullscreen opened.");
        return;
      } catch {
        // Continue to guaranteed in-page theater fallback.
      }
    }

    enterTheaterMode();
  };

  return (
    <div
      ref={shellRef}
      className={theaterMode ? "fixed inset-0 z-[120] flex flex-col justify-center overflow-y-auto bg-black/95 p-3 sm:p-6" : className}
      data-testid="factory-video-shell"
      data-theater={theaterMode ? "true" : "false"}
      role={theaterMode ? "dialog" : undefined}
      aria-modal={theaterMode ? "true" : undefined}
      aria-label={theaterMode ? "Factory capability video theater view" : undefined}
    >
      <div className="overflow-hidden rounded-xl border border-border/70 bg-black shadow-2xl shadow-black/10">
        <video
          ref={videoRef}
          data-testid="factory-video"
          className={theaterMode ? "mx-auto max-h-[calc(100dvh-8rem)] h-auto w-full bg-black object-contain" : "aspect-[910/512] h-auto w-full bg-black object-contain"}
          controls
          playsInline
          preload={preload}
          poster={FACTORY_CAPABILITY_POSTER_URL}
          width={910}
          height={512}
          aria-describedby="factory-capability-video-description"
          title={FACTORY_CAPABILITY_TITLE}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={() => setStatus("The factory video could not be loaded. Please retry or request a live factory call.")}
        >
          <source src={FACTORY_CAPABILITY_VIDEO_URL} type="video/mp4" />
          Your browser does not support HTML video. You can request a live factory video call instead.
        </video>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" aria-label="Factory video controls">
        <button
          type="button"
          data-testid="factory-video-play"
          onClick={handlePlayPause}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {isPlaying ? <Pause size={15} aria-hidden="true" /> : <Play size={15} fill="currentColor" aria-hidden="true" />}
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          data-testid="factory-video-fullscreen"
          onClick={handleFullScreen}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <Maximize2 size={15} aria-hidden="true" /> Full Screen
        </button>
        <button
          type="button"
          data-testid="factory-video-theater"
          onClick={() => setTheaterMode((current) => !current)}
          aria-pressed={theaterMode}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {theaterMode ? <Minimize2 size={15} aria-hidden="true" /> : <MonitorUp size={15} aria-hidden="true" />}
          {theaterMode ? "Exit Theater" : "Theater Mode"}
        </button>
      </div>

      <p className="sr-only" aria-live="polite">{status}</p>
      <p id="factory-capability-video-description" className={theaterMode ? "mt-3 text-xs leading-5 text-white/70" : "mt-3 text-xs leading-5 text-foreground/58"}>
        Visual overview: pattern preparation, fabric marking, cutting-table support, industrial lockstitch and overlock sewing, finishing support and buyer communication. The approved source video includes burned-in subtitles; a separate exact transcript is not currently available.
      </p>
    </div>
  );
}

export function FactoryCapabilityPosterLink({
  className = "",
  label = "Play factory video",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Link
      to={FACTORY_CAPABILITY_WATCH_PATH}
      className={`group relative block overflow-hidden rounded-xl border border-border/70 bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${className}`}
      aria-label="Watch the real Irha Apparels factory capability video"
    >
      <img
        src={FACTORY_CAPABILITY_POSTER_URL}
        alt="Real Irha Apparels factory manufacturing floor in Sialkot"
        width={910}
        height={512}
        loading="lazy"
        decoding="async"
        className="aspect-[910/512] h-auto w-full object-cover transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.01] motion-reduce:group-hover:scale-100"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" aria-hidden="true" />
      <span className="absolute inset-x-4 bottom-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-black/78 px-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm sm:inset-x-auto sm:left-5 sm:px-5">
        <Play size={14} fill="currentColor" aria-hidden="true" /> {label}
      </span>
    </Link>
  );
}
