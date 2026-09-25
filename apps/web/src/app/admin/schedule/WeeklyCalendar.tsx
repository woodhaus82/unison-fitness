import Link from "next/link";
import { addDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";

const DAY_COUNT = 7;

// Grid bounds and scale — a fixed 06:00-19:30 range covers the gym's
// actual opening hours with room either side, at 1hr-tall gridlines.
// Session blocks are positioned continuously within this by real time,
// not snapped to the gridlines, so e.g. a 07:30-09:00 class lines up
// exactly with the half-hour mark instead of the nearest hour row.
const GRID_START_MINUTES = 6 * 60;
const GRID_END_MINUTES = 19.5 * 60;
const PX_PER_HOUR = 80;
const GRID_HEIGHT = ((GRID_END_MINUTES - GRID_START_MINUTES) / 60) * PX_PER_HOUR;
const HOUR_MARKS = Array.from(
  { length: Math.floor(GRID_END_MINUTES / 60) - GRID_START_MINUTES / 60 + 1 },
  (_, i) => GRID_START_MINUTES / 60 + i
);

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function offsetFor(time: string) {
  const minutes = Math.min(Math.max(timeToMinutes(time), GRID_START_MINUTES), GRID_END_MINUTES);
  return ((minutes - GRID_START_MINUTES) / 60) * PX_PER_HOUR;
}

export async function WeeklyCalendar({ weekStart }: { weekStart: Date }) {
  const supabase = await createClient();

  const days = Array.from({ length: DAY_COUNT }, (_, i) => addDays(weekStart, i));
  const weekStartStr = format(days[0], "yyyy-MM-dd");
  const weekEndStr = format(days[DAY_COUNT - 1], "yyyy-MM-dd");

  // Materializes any sessions for this week that don't exist yet, from the
  // recurring template — idempotent, so this is safe to call on every view.
  await supabase.rpc("generate_sessions_from_schedule", { p_week_start: weekStartStr });

  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("id, session_date, start_time, end_time, capacity, class_types(name, color)")
    .gte("session_date", weekStartStr)
    .lte("session_date", weekEndStr)
    .eq("status", "scheduled")
    .order("start_time");

  if (!sessions || sessions.length === 0) {
    return (
      <p className="text-neutral-400">
        Nothing scheduled this week — add slots to the recurring template, or import a spreadsheet, to populate it.
      </p>
    );
  }

  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("session_id, status")
    .in("session_id", sessions.map((s) => s.id))
    .in("status", ["booked", "waitlisted"]);

  const counts = new Map<string, { booked: number; waitlisted: number }>();
  for (const b of bookingRows ?? []) {
    const entry = counts.get(b.session_id) ?? { booked: 0, waitlisted: 0 };
    if (b.status === "booked") entry.booked += 1;
    else entry.waitlisted += 1;
    counts.set(b.session_id, entry);
  }

  // Group by "date|start_time" so multiple classes at the same slot (rare,
  // e.g. two rooms running at once) lay out side by side instead of
  // overlapping.
  const byDay = new Map<string, typeof sessions>();
  for (const s of sessions) {
    if (!byDay.has(s.session_date)) byDay.set(s.session_date, []);
    byDay.get(s.session_date)!.push(s);
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[900px]">
        <div className="w-14 shrink-0" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="min-w-[120px] flex-1 border-b border-l border-neutral-800 px-2 py-2 text-xs font-medium text-neutral-400"
          >
            {format(day, "EEE d MMM")}
          </div>
        ))}
      </div>

      <div className="flex min-w-[900px]">
        <div className="relative w-14 shrink-0" style={{ height: GRID_HEIGHT }}>
          {HOUR_MARKS.map((h) => (
            <div
              key={h}
              className="absolute right-2 -translate-y-1/2 text-xs font-medium text-neutral-400"
              style={{ top: (h - GRID_START_MINUTES / 60) * PX_PER_HOUR }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const daySessions = byDay.get(dateStr) ?? [];

          // Cluster sessions that share an exact start time so they can
          // split the column width between them instead of stacking.
          const clusters = new Map<string, typeof sessions>();
          for (const s of daySessions) {
            if (!clusters.has(s.start_time)) clusters.set(s.start_time, []);
            clusters.get(s.start_time)!.push(s);
          }

          return (
            <div
              key={dateStr}
              className="relative min-w-[120px] flex-1 border-l border-neutral-800"
              style={{ height: GRID_HEIGHT }}
            >
              {HOUR_MARKS.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-neutral-800/60"
                  style={{ top: (h - GRID_START_MINUTES / 60) * PX_PER_HOUR }}
                />
              ))}

              {[...clusters.values()].flatMap((cluster) =>
                cluster.map((s, i) => {
                  const classType = Array.isArray(s.class_types) ? s.class_types[0] : s.class_types;
                  const count = counts.get(s.id) ?? { booked: 0, waitlisted: 0 };
                  const full = count.booked >= s.capacity;
                  const top = offsetFor(s.start_time);
                  const height = Math.max(offsetFor(s.end_time) - top, 24);
                  const widthPct = 100 / cluster.length;

                  return (
                    <Link
                      key={s.id}
                      href={`/admin/roster/${s.id}`}
                      className="absolute overflow-hidden rounded-md border border-neutral-800 bg-neutral-900/60 px-2 py-1 text-xs hover:bg-neutral-800"
                      style={{
                        top,
                        height,
                        left: `${i * widthPct}%`,
                        width: `${widthPct}%`,
                        borderLeftColor: classType?.color,
                        borderLeftWidth: classType?.color ? 3 : undefined,
                      }}
                    >
                      <div className="truncate">{classType?.name ?? "Class"}</div>
                      <div className="text-neutral-500">
                        {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                      </div>
                      <div className={full ? "font-medium text-amber-400" : "text-neutral-400"}>
                        {count.booked}/{s.capacity}
                        {count.waitlisted > 0 ? ` (+${count.waitlisted} waiting)` : ""}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
