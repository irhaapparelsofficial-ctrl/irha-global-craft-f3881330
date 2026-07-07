// Calendar-driven occasional banners.
// Each occasion has a date window (inclusive) and renders a temporary banner
// while the window is active. Copy must stay informational unless a commercial
// offer or operating-hours change has been explicitly approved.

export type Occasion = {
  id: string;
  label: string;
  message: string;
  cta?: { text: string; href: string };
  start: string;
  end: string;
  priority?: number;
  theme?: "gold" | "ivory" | "emerald" | "crimson";
};

export const OCCASIONS: Occasion[] = [
  // ─── Pakistan national days ─────────────────────────────
  {
    id: "pakistan-day-2027",
    label: "Pakistan Day",
    message: "Honouring Pakistan and the craft heritage of Sialkot — 23 March.",
    start: "2027-03-22", end: "2027-03-24",
    theme: "emerald",
  },
  {
    id: "independence-day-2026",
    label: "14 August · Independence Day",
    message: "Celebrating Pakistan and the manufacturing craft of Sialkot.",
    start: "2026-08-13", end: "2026-08-15",
    theme: "emerald", priority: 1,
  },
  {
    id: "independence-day-2027",
    label: "14 August · Independence Day",
    message: "Celebrating Pakistan and the manufacturing craft of Sialkot.",
    start: "2027-08-13", end: "2027-08-15",
    theme: "emerald", priority: 1,
  },

  // ─── Eid ────────────────────────────────────────────────
  {
    id: "eid-ul-fitr-2027",
    label: "Eid Mubarak",
    message: "Eid Mubarak from Irha Apparels. Response times may vary during the holiday period.",
    start: "2027-03-06", end: "2027-03-11",
    theme: "gold", priority: 2,
  },
  {
    id: "eid-ul-adha-2026",
    label: "Eid Mubarak",
    message: "Eid Mubarak from Irha Apparels. Response times may vary during the holiday period.",
    start: "2026-05-24", end: "2026-05-29",
    theme: "gold", priority: 2,
  },
  {
    id: "eid-ul-adha-2027",
    label: "Eid Mubarak",
    message: "Eid Mubarak from Irha Apparels. Response times may vary during the holiday period.",
    start: "2027-05-14", end: "2027-05-19",
    theme: "gold", priority: 2,
  },

  // ─── Oktoberfest sourcing season ────────────────────────
  {
    id: "oktoberfest-2026",
    label: "Oktoberfest Season",
    message: "Planning a Lederhosen or Dirndl program? Share your target delivery window for a production review.",
    cta: { text: "Discuss a Program", href: "/inquiry?intent=rfq" },
    start: "2026-09-19", end: "2026-10-04",
    theme: "gold", priority: 1,
  },
  {
    id: "oktoberfest-2027",
    label: "Oktoberfest Season",
    message: "Planning a Lederhosen or Dirndl program? Share your target delivery window for a production review.",
    cta: { text: "Discuss a Program", href: "/inquiry?intent=rfq" },
    start: "2027-09-18", end: "2027-10-03",
    theme: "gold", priority: 1,
  },

  // ─── Western retail calendar ────────────────────────────
  {
    id: "black-friday-2026",
    label: "Black Friday Planning",
    message: "Preparing a seasonal retail program? Request a custom production and quotation review.",
    cta: { text: "Get a Quote", href: "/inquiry?intent=rfq" },
    start: "2026-11-23", end: "2026-11-30",
    theme: "crimson", priority: 1,
  },
  {
    id: "black-friday-2027",
    label: "Black Friday Planning",
    message: "Preparing a seasonal retail program? Request a custom production and quotation review.",
    cta: { text: "Get a Quote", href: "/inquiry?intent=rfq" },
    start: "2027-11-22", end: "2027-11-29",
    theme: "crimson", priority: 1,
  },
  {
    id: "christmas-newyear-2026",
    label: "Season's Greetings",
    message: "Season's greetings from Irha Apparels. Response times may vary during the holiday period.",
    start: "2026-12-22", end: "2027-01-02",
    theme: "ivory",
  },
  {
    id: "christmas-newyear-2027",
    label: "Season's Greetings",
    message: "Season's greetings from Irha Apparels. Response times may vary during the holiday period.",
    start: "2027-12-22", end: "2028-01-02",
    theme: "ivory",
  },

  // ─── Sourcing calendar ──────────────────────────────────
  {
    id: "cny-2027",
    label: "Lunar New Year Planning",
    message: "Planning around Lunar New Year supply timelines? Discuss your sourcing schedule with our team.",
    cta: { text: "Discuss a Program", href: "/inquiry?intent=rfq" },
    start: "2027-02-01", end: "2027-02-20",
    theme: "crimson", priority: 1,
  },
];

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Return the highest-priority occasion active on the visitor's local date. */
export function activeOccasion(now: Date = new Date()): Occasion | null {
  const today = localDateKey(now);
  const matches = OCCASIONS.filter((occasion) => today >= occasion.start && today <= occasion.end);
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
}