import { Instagram, Facebook, Linkedin } from "lucide-react";

const ITEMS = [
  { name: "Instagram", href: "https://www.instagram.com/irhaapparels", Icon: Instagram },
  { name: "Facebook", href: "https://web.facebook.com/profile.php?id=61590950402472", Icon: Facebook },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/irha-apparels", Icon: Linkedin },
];

export default function FloatingSocialRail() {
  return (
    <aside
      aria-label="Social media"
      className="fixed left-3 top-1/2 -translate-y-1/2 z-30 hidden lg:flex flex-col items-center gap-2 p-2 border border-border/60 bg-background/70 backdrop-blur-md"
    >
      <span className="text-[9px] font-mono tracking-[0.3em] uppercase text-muted-foreground [writing-mode:vertical-rl] rotate-180 py-2">
        Follow
      </span>
      {ITEMS.map(({ name, href, Icon }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Irha Apparels on ${name}`}
          className="p-2 text-foreground/60 hover:text-gold hover:bg-foreground/5 transition-colors"
        >
          <Icon size={16} strokeWidth={1.5} />
        </a>
      ))}
    </aside>
  );
}
