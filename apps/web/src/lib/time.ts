// session_date/start_time are stored as UK local wall-clock time (the gym
// is in Poole, UK), not UTC. Comparing them against `new Date()` directly
// is wrong whenever the server's timezone differs from the UK's current
// offset — which it does for most of the year, since Vercel runs in UTC
// and the UK is on BST (UTC+1) for roughly half of it. This returns the
// current wall-clock time in the UK as the same "YYYY-MM-DDTHH:MM:SS"
// shape session_date/start_time combine into, so a plain string/Date
// comparison between the two is correct regardless of DST.
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
