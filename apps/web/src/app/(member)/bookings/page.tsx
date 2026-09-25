import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { CancelButton } from "@/components/BookingButton";

const STATUS_LABEL: Record<string, string> = {
  booked: "Booked",
  waitlisted: "Waitlisted",
  cancelled: "Cancelled",
  late_cancelled: "Late cancelled",
  attended: "Attended",
  no_show: "No-show",
};

export default async function BookingsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      "id, status, waitlist_position, booked_at, class_sessions(session_date, start_time, end_time, class_types(name))"
    )
    .eq("user_id", profile.id)
    .order("booked_at", { ascending: false })
    .limit(50);

  if (error) {
    return <main className="mx-auto max-w-2xl px-6 py-12">Failed to load bookings: {error.message}</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">My bookings</h1>

      <ul className="mt-8 flex flex-col gap-2">
        {(bookings ?? []).map((b) => {
          // Supabase's TS types infer nested selects as arrays even for
          // to-one relationships; these are always single rows here.
          const session = Array.isArray(b.class_sessions) ? b.class_sessions[0] : b.class_sessions;
          const classType = session ? (Array.isArray(session.class_types) ? session.class_types[0] : session.class_types) : null;
          const active = b.status === "booked" || b.status === "waitlisted";

          return (
            <li
              key={b.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
            >
              <div>
                <p className="font-medium">
                  {session ? format(parseISO(session.session_date), "EEE d MMM") : "—"}
                  {session ? ` · ${session.start_time.slice(0, 5)}` : ""} · {classType?.name ?? "Class"}
                </p>
                <p className="text-sm text-neutral-500">
                  {STATUS_LABEL[b.status] ?? b.status}
                  {b.status === "waitlisted" && b.waitlist_position ? ` (#${b.waitlist_position})` : ""}
                </p>
              </div>
              {active && <CancelButton bookingId={b.id} />}
            </li>
          );
        })}

        {(bookings ?? []).length === 0 && (
          <p className="text-neutral-500">No bookings yet — head to the schedule to book a class.</p>
        )}
      </ul>
    </main>
  );
}
