// Calendar-driven occasional banners.
// Each occasion has a date window (inclusive) and renders an aarzi (temporary)
// banner at the top of the site while the window is active.
//
// Dates are written as ISO `YYYY-MM-DD`. For Islamic occasions (Eid), we list
// specific Gregorian years because the Hijri calendar drifts ~11 days/year.
// Add a new entry each year — the highest-priority active one wins.

export type Occasion = {
  id: string;                 // stable id, used for dismiss memory
  label: string;              // small eyebrow text (e.g. "EID MUBARAK")
  message: string;            // main one-line message
  cta?: { text: string; href: string }; // optional call-to-action
  start: string;              // ISO date, inclusive
  end: string;                // ISO date, inclusive
  priority?: number;          // higher wins if windows overlap (default 0)
  theme?: "gold" | "ivory" | "emerald" | "crimson";
};

export const OCCASIONS: Occasion[] = [
  // ─── Pakistan national days ─────────────────────────────
  {
    id: "pakistan-day-2027",
    label: "Pakistan Day",
    message: "Honouring the craft of Sialkot — 23rd March.",
    start: "2027-03-22", end: "2027-03-24",
    theme: "emerald",
  },
  {
    id: "independence-day-2026",
    label: "14 August · Independence Day",
    message: "Proudly crafted in Pakistan since 2018.",
    start: "2026-08-13", end: "2026-08-15",
    theme: "emerald", priority: 1,
  },
  {
    id: "independence-day-2027",
    label: "14 August · Independence Day",
    message: "Proudly crafted in Pakistan since 2018.",
    start: "2027-08-13", end: "2027-08-15",
    theme: "emerald", priority: 1,
  },

  // ─── Eid (Gregorian dates, approximate) ─────────────────
  {
    id: "eid-ul-fitr-2027",
    label: "Eid Mubarak",
    message: "Atelier closed 8–11 March for Eid ul-Fitr. Quotes resume 12 March.",
    start: "2027-03-06", end: "2027-03-11",
    theme: "gold", priority: 2,
  },
  {
    id: "eid-ul-adha-2026",
    label: "Eid Mubarak",
    message: "Atelier closed 26–29 May for Eid ul-Adha. Quotes resume 30 May.",
    start: "2026-05-24", end: "2026-05-29",
    theme: "gold", priority: 2,
  },
  {
    id: "eid-ul-adha-2027",
    label: "Eid Mubarak",
    message: "Atelier closed 16–19 May for Eid ul-Adha. Quotes resume 20 May.",
    start: "2027-05-14", end: "2027-05-19",
    theme: "gold", priority: 2,
  },

  // ─── Oktoberfest (key for Bavarian Wear) ────────────────
  {
    id: "oktoberfest-2026",
    label: "Oktoberfest Season",
    message: "Lederhosen & Dirndl programs — book Sep 2027 production now.",
    cta: { text: "Request a Tech-Pack", href: "/inquiry" },
    start: "2026-09-19", end: "2026-10-04",
    theme: "gold", priority: 1,
  },
  {
    id: "oktoberfest-2027",
    label: "Oktoberfest Season",
    message: "Lederhosen & Dirndl programs — book Sep 2028 production now.",
    cta: { text: "Request a Tech-Pack", href: "/inquiry" },
    start: "2027-09-18", end: "2027-10-03",
    theme: "gold", priority: 1,
  },

  // ─── Western retail calendar ────────────────────────────
  {
    id: "black-friday-2026",
    label: "Black Friday Week",
    message: "Sample fee waived on programs confirmed before 4 December.",
    cta: { text: "Get a Quote", href: "/inquiry" },
    start: "2026-11-23", end: "2026-11-30",
    theme: "crimson", priority: 1,
  },
  {
    id: "black-friday-2027",
    label: "Black Friday Week",
    message: "Sample fee waived on programs confirmed before 3 December.",
    cta: { text: "Get a Quote", href: "/inquiry" },
    start: "2027-11-22", end: "2027-11-29",
    theme: "crimson", priority: 1,
  },
  {
    id: "christmas-newyear-2026",
    label: "Season's Greetings",
    message: "Atelier on reduced hours 24 Dec – 2 Jan. Replies within 24h.",
    start: "2026-12-22", end: "2027-01-02",
    theme: "ivory",
  },
  {
    id: "christmas-newyear-2027",
    label: "Season's Greetings",
    message: "Atelier on reduced hours 24 Dec – 2 Jan. Replies within 24h.",
    start: "2027-12-22", end: "2028-01-02",
    theme: "ivory",
  },

  // ─── Sourcing-season relevant ───────────────────────────
  {
    id: "cny-2027",
    label: "Lunar New Year",
    message: "China factories closed Feb 6–20. Irha Apparels — open & shipping.",
    cta: { text: "Switch Supplier", href: "/inquiry" },
    start: "2027-02-01", end: "2027-02-20",
    theme: "crimson", priority: 1,
  },
];

/**
 * Return the highest-priority occasion that is active on `now`, or null.
 */
export function activeOccasion(now: Date = new Date()): Occasion | null {
  const today = now.toISOString().slice(0, 10);
  const matches = OCCASIONS.filter((o) => today >= o.start && today <= o.end);
  if (matches.length === 0) return null;
  return matches.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
}
