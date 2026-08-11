import { Link } from "react-router-dom";
import { Play } from "lucide-react";

export const FACTORY_CAPABILITY_VIDEO_URL =
  "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/factory/irha-apparels-factory-capability-2026.mp4";
export const FACTORY_CAPABILITY_POSTER_URL =
  "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/factory/irha-apparels-factory-capability-poster.webp";

export const FACTORY_CAPABILITY_TITLE = "Inside Irha Apparels — real factory capability overview";
export const FACTORY_CAPABILITY_DESCRIPTION =
  "A real prerecorded capability overview showing Irha Apparels manufacturing activity in Sialkot, including pattern preparation, fabric marking, cutting-table support, industrial lockstitch and overlock sewing, finishing support and buyer communication.";

export function FactoryCapabilityPlayer({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <div className="overflow-hidden rounded-xl border border-border/70 bg-black shadow-2xl shadow-black/10">
        <video
          className="aspect-[910/512] h-auto w-full bg-black object-contain"
          controls
          playsInline
          preload="none"
          poster={FACTORY_CAPABILITY_POSTER_URL}
          width={910}
          height={512}
          aria-describedby="factory-capability-video-description"
          title={FACTORY_CAPABILITY_TITLE}
        >
          <source src={FACTORY_CAPABILITY_VIDEO_URL} type="video/mp4" />
          Your browser does not support HTML video. You can request a live factory video call instead.
        </video>
      </div>
      <p id="factory-capability-video-description" className="mt-3 text-xs leading-5 text-foreground/58">
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
      to="/manufacturing#factory-video"
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
