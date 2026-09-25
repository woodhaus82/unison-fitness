import Link from "next/link";
import { addDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";

const DAY_COUNT = 7;

export async function WeeklyCalendar({ weekStart }: { weekStart: Date }) {
  const supabase = await createClient();

  const days = Array.from({ length: DAY_COUNT }, (_, i) => addDays(weekStart, i));
  const weekStartStr = format(days[0], "yyyy-MM-dd");
  const weekEndStr = format(days[DAY_COUNT - 1], "yyyy-MM-dd");

  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("id, session_date, start_time, end_time, class_types(name, color)")
    .gte("session_date", weekStartStr)
    .lte("session_date", weekEndStr)
    .eq("status", "scheduled")
    .order("start_time");

  if (!sessions || sessions.length === 0) {
    return (
      <p className="text-neutral-500">
        No sessions generated for this week yet — use &quot;Generate this week from recurring template&quot; above,
        or import a spreadsheet.
      </p>
    );
  }

  // Group by "date|start_time" so multiple classes at the same slot (rare,
  // e.g. two rooms running at once) still show up in one cell.
  const byCell = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const key = `${s.session_date}|${s.start_time}`;
    if (!byCell.has(key)) byCell.set(key, []);
    byCell.get(key)!.push(s);
  }

  const rowTimes = [...new Set(sessions.map((s) => s.start_time))].sort();

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="w-20 border-b border-neutral-200 py-2 pr-2 text-left text-xs font-medium text-neutral-500">
              Time
            </th>
            {days.map((day) => (
              <th
                key={day.toISOString()}
                className="min-w-[120px] border-b border-l border-neutral-200 px-2 py-2 text-left text-xs font-medium text-neutral-500"
              >
                {format(day, "EEE d MMM")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowTimes.map((time) => (
            <tr key={time}>
              <td className="border-b border-neutral-100 py-2 pr-2 align-top text-xs font-medium text-neutral-500">
                {time.slice(0, 5)}
              </td>
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const cellSessions = byCell.get(`${dateStr}|${time}`) ?? [];
                return (
                  <td key={dateStr} className="border-b border-l border-neutral-100 p-1 align-top">
                    <div className="flex flex-col gap-1">
                      {cellSessions.map((s) => {
                        const classType = Array.isArray(s.class_types) ? s.class_types[0] : s.class_types;
                        return (
                          <Link
                            key={s.id}
                            href={`/admin/roster/${s.id}`}
                            className="block rounded-md border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50"
                            style={classType?.color ? { borderLeftColor: classType.color, borderLeftWidth: 3 } : undefined}
                          >
                            {classType?.name ?? "Class"}
                          </Link>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
