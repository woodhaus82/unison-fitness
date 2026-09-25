// session_date/start_time are stored as UK local wall-clock time (the gym
// is in Poole, UK). Comparing them against `new Date()` directly would be
// wrong whenever the device's timezone differs from the UK's current
// offset (e.g. BST vs GMT), so resolve "now" as UK wall-clock time first
// and compare like-for-like — mirrors apps/web/src/lib/time.ts.
export function nowInUk(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

export function isSessionPast(sessionDate: string, startTime: string): boolean {
  return `${sessionDate}T${startTime}` < nowInUk();
}

// Monday-anchored start of the week containing `date`, as YYYY-MM-DD.
export function startOfWeekMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday .. 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateString(d);
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return toDateString(date);
}

export function addMonthsToDateString(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1 + months, d);
  return startOfWeekMonday(date);
}
