import Link from "next/link";
import { addDays, addMonths, format, parseISO, startOfWeek } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { BookButton, CancelButton } from "@/components/BookingButton";
import { WorkoutLink } from "@/components/WorkoutLink";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await requireProfile();
  const supabase = await createClient();
  const { week } = await searchParams;

  const today = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStart = week ? startOfWeek(parseISO(week), { weekStartsOn: 1 }) : today;
  const weekEnd = addDays(weekStart, 6);
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");
  const isCurrentWeek = weekStartStr === format(today, "yyyy-MM-dd");

  // Materializes this week's sessions from the recurring template if they
  // don't already exist — idempotent, so safe on every view. This is what
  // lets members browse and book arbitrarily far ahead without an admin
  // having generated that week first.
  await supabase.rpc("generate_sessions_from_schedule", { p_week_start: weekStartStr });

  const { data: sessions, error } = await supabase.rpc("list_sessions", {
    p_from: weekStartStr,
    p_to: weekEndStr,
  });

  if (error) {
    return <main className="mx-auto max-w-2xl px-6 py-12">Failed to load schedule: {error.message}</main>;
  }

  const byDay = new Map<string, typeof sessions>();
  for (const s of sessions ?? []) {
    const key = s.session_date;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(s);
  }

  const nav = (label: string, target: Date) => (
    <Link href={`/schedule?week=${format(target, "yyyy-MM-dd")}`} className="underline">
      {label}
    </Link>
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM yyyy")}
        </h1>
        {isCurrentWeek && <span className="text-sm text-neutral-500">This week</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-medium text-neutral-600">
        {nav("← Month", addMonths(weekStart, -1))}
        {nav("← Week", addDays(weekStart, -7))}
        {!isCurrentWeek && nav("This week", today)}
        {nav("Week →", addDays(weekStart, 7))}
        {nav("Month →", addMonths(weekStart, 1))}
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {[...byDay.entries()].map(([date, daySessions]) => (
          <details key={date}>
            <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-neutral-500 marker:text-neutral-400">
              {format(parseISO(date), "EEEE d MMMM")}
              <span className="ml-2 text-xs font-normal normal-case text-neutral-400">
                ({daySessions!.length} class{daySessions!.length === 1 ? "" : "es"})
              </span>
            </summary>
            <ul className="mt-3 flex flex-col gap-2">
              {daySessions!.map((s) => {
                const full = s.booked_count >= s.capacity;
                const isPast = new Date(`${s.session_date}T${s.start_time}`) < new Date();
                return (
                  <li key={s.id} className="rounded-lg border border-neutral-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} · {s.class_type_name}
                        </p>
                        {s.coach_name && <p className="text-sm text-neutral-500">Coach: {s.coach_name}</p>}
                        <p className="text-sm text-neutral-500">
                          {s.booked_count}/{s.capacity} booked
                          {s.waitlist_count > 0 ? ` · ${s.waitlist_count} waitlisted` : ""}
                        </p>
                        {s.my_booking_status === "waitlisted" && (
                          <p className="text-sm text-amber-600">
                            You&apos;re #{s.my_waitlist_position} on the waitlist
                          </p>
                        )}
                        {s.my_booking_status === "booked" && (
                          <p className="text-sm text-green-700">You&apos;re booked in</p>
                        )}
                      </div>

                      {isPast ? (
                        <span className="text-sm text-neutral-400">Class has passed</span>
                      ) : s.my_booking_id ? (
                        <CancelButton bookingId={s.my_booking_id} />
                      ) : (
                        <BookButton sessionId={s.id} full={full} />
                      )}
                    </div>

                    <div className="mt-2">
                      <WorkoutLink wod={s.wod} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}

        {byDay.size === 0 && <p className="text-neutral-500">No classes scheduled this week.</p>}
      </div>
    </main>
  );
}
