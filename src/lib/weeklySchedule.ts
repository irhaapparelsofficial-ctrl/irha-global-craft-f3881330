const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function nextFutureWeeklyOccurrence(
  value: string | Date,
  now: Date = new Date(),
  minimumLeadMinutes = 15,
): Date | null {
  const proposed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(proposed.getTime()) || Number.isNaN(now.getTime())) return null;

  const threshold = now.getTime() + Math.max(0, minimumLeadMinutes) * 60_000;
  while (proposed.getTime() < threshold) proposed.setTime(proposed.getTime() + WEEK_MS);
  return proposed;
}
