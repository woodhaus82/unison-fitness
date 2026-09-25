import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { CheckInButton } from "./CheckInButton";
import { WodEditor } from "./WodEditor";

const STATUS_LABEL: Record<string, string> = {
  booked: "Booked",
  waitlisted: "Waitlisted",
  cancelled: "Cancelled",
  late_cancelled: "Late cancelled",
  attended: "Attended",
  no_show: "No-show",
};

export default async function RosterPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("class_sessions")
    .select("id, session_date, start_time, end_time, capacity, wod, class_types(name)")
    .eq("id", sessionId)
    .single();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, waitlist_position, checked_in_at, profiles(full_name, email)")
    .eq("session_id", sessionId)
    .order("status")
    .order("booked_at");

  if (!session) {
    return <p>Session not found.</p>;
  }

  const classType = Array.isArray(session.class_types) ? session.class_types[0] : session.class_types;

  return (
    <div>
      <h1 className="text-2xl font-semibold">
        {classType?.name ?? "Class"} · {format(parseISO(session.session_date), "EEEE d MMMM")}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {session.start_time.slice(0, 5)}–{session.end_time.slice(0, 5)} · Capacity {session.capacity}
      </p>

      <WodEditor sessionId={sessionId} initialWod={session.wod} />

      <ul className="mt-8 flex flex-col gap-2">
        {(bookings ?? []).map((b) => {
          const member = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
          const canCheckIn = b.status === "booked";
          return (
            <li
              key={b.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
            >
              <div>
                <p className="font-medium">{member?.full_name ?? member?.email ?? "Member"}</p>
                <p className="text-sm text-neutral-500">
                  {STATUS_LABEL[b.status] ?? b.status}
                  {b.status === "waitlisted" && b.waitlist_position ? ` (#${b.waitlist_position})` : ""}
                </p>
              </div>
              {canCheckIn && <CheckInButton bookingId={b.id} sessionId={sessionId} />}
            </li>
          );
        })}
        {(bookings ?? []).length === 0 && <p className="text-neutral-500">No bookings for this session.</p>}
      </ul>
    </div>
  );
}
