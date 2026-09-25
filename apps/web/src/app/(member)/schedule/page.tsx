import { addDays, format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { BookButton, CancelButton } from "@/components/BookingButton";

export default async function SchedulePage() {
  await requireProfile();
  const supabase = await createClient();

  const from = new Date();
  const to = addDays(from, 7);

  const { data: sessions, error } = await supabase.rpc("list_sessions", {
    p_from: format(from, "yyyy-MM-dd"),
    p_to: format(to, "yyyy-MM-dd"),
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

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">This week</h1>

      <div className="mt-8 flex flex-col gap-8">
        {[...byDay.entries()].map(([date, daySessions]) => (
          <section key={date}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {format(parseISO(date), "EEEE d MMMM")}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {daySessions!.map((s) => {
                const full = s.booked_count >= s.capacity;
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} · {s.class_type_name}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {s.coach_name ? `${s.coach_name} · ` : ""}
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

                    {s.my_booking_id ? (
                      <CancelButton bookingId={s.my_booking_id} />
                    ) : (
                      <BookButton sessionId={s.id} full={full} />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {byDay.size === 0 && (
          <p className="text-neutral-500">No classes scheduled this week yet — check back soon.</p>
        )}
      </div>
    </main>
  );
}
