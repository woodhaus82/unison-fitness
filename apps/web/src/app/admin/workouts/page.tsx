import Link from "next/link";
import { addDays, addMonths, format, parseISO, startOfWeek } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { DayWodEditor } from "./DayWodEditor";

export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const supabase = await createClient();

  const today = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStart = week ? startOfWeek(parseISO(week), { weekStartsOn: 1 }) : today;
  const weekEnd = addDays(weekStart, 6);
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");
  const isCurrentWeek = weekStartStr === format(today, "yyyy-MM-dd");

  // Same auto-materialization as the calendar, so this page works even if
  // nobody's visited the schedule for this week yet.
  await supabase.rpc("generate_sessions_from_schedule", { p_week_start: weekStartStr });

  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("class_type_id, session_date, wod, class_types(name)")
    .gte("session_date", weekStartStr)
    .lte("session_date", weekEndStr)
    .eq("status", "scheduled")
    .order("session_date");

  // Group into one entry per (class type, day), taking the first session's
  // wod as the representative value and counting how many sessions it'll
  // apply to when saved.
  type Entry = { classTypeId: string; className: string; sessionDate: string; wod: string; count: number };
  const entries = new Map<string, Entry>();
  for (const s of sessions ?? []) {
    const classType = Array.isArray(s.class_types) ? s.class_types[0] : s.class_types;
    const key = `${s.class_type_id}|${s.session_date}`;
    const existing = entries.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      entries.set(key, {
        classTypeId: s.class_type_id,
        className: classType?.name ?? "Class",
        sessionDate: s.session_date,
        wod: s.wod ?? "",
        count: 1,
      });
    }
  }

  const byDay = new Map<string, Entry[]>();
  for (const entry of entries.values()) {
    if (!byDay.has(entry.sessionDate)) byDay.set(entry.sessionDate, []);
    byDay.get(entry.sessionDate)!.push(entry);
  }
  for (const dayEntries of byDay.values()) {
    dayEntries.sort((a, b) => a.className.localeCompare(b.className));
  }

  const days = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd"));

  const nav = (label: string, target: Date) => (
    <Link href={`/admin/workouts?week=${format(target, "yyyy-MM-dd")}`} className="underline">
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-semibold">Weekly workouts</h1>
        <p className="mt-1 text-sm text-neutral-500">
          One workout per class type per day — it applies to every session of that type that day, however many time
          slots it runs in. Leave blank for no workout posted.
        </p>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM yyyy")}
            {isCurrentWeek && <span className="ml-2 text-sm font-normal text-neutral-500">(this week)</span>}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
            {nav("← Month", addMonths(weekStart, -1))}
            {nav("← Week", addDays(weekStart, -7))}
            {nav("This week", today)}
            {nav("Week →", addDays(weekStart, 7))}
            {nav("Month →", addMonths(weekStart, 1))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-6">
          {days.map((date) => {
            const dayEntries = byDay.get(date) ?? [];
            if (dayEntries.length === 0) return null;
            return (
              <div key={date}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  {format(parseISO(date), "EEEE d MMMM")}
                </h3>
                <div className="mt-2 flex flex-col gap-4">
                  {dayEntries.map((entry) => (
                    <div key={`${entry.classTypeId}|${entry.sessionDate}`}>
                      <label className="text-sm font-medium">{entry.className}</label>
                      <div className="mt-1">
                        <DayWodEditor
                          classTypeId={entry.classTypeId}
                          sessionDate={entry.sessionDate}
                          initialWod={entry.wod}
                          sessionCount={entry.count}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {byDay.size === 0 && <p className="text-neutral-500">Nothing scheduled this week.</p>}
        </div>
      </section>
    </div>
  );
}
