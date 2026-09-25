import Link from "next/link";
import { addDays, format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { ScheduleUploader } from "./ScheduleUploader";
import { GenerateWeekButton } from "./GenerateWeekButton";

export default async function AdminSchedulePage() {
  const supabase = await createClient();

  const from = new Date();
  const to = addDays(from, 14);

  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("id, session_date, start_time, end_time, capacity, class_types(name)")
    .gte("session_date", format(from, "yyyy-MM-dd"))
    .lte("session_date", format(to, "yyyy-MM-dd"))
    .order("session_date")
    .order("start_time");

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-semibold">Class programming</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Generate the week from your recurring template, or import/override it from a spreadsheet.
        </p>
        <div className="mt-4">
          <GenerateWeekButton />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Import schedule</h2>
        <div className="mt-4">
          <ScheduleUploader />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Upcoming sessions</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {(sessions ?? []).map((s) => {
            const classType = Array.isArray(s.class_types) ? s.class_types[0] : s.class_types;
            return (
              <li key={s.id}>
                <Link
                  href={`/admin/roster/${s.id}`}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
                >
                  <span>
                    {format(parseISO(s.session_date), "EEE d MMM")} · {s.start_time.slice(0, 5)} ·{" "}
                    {classType?.name ?? "Class"}
                  </span>
                  <span className="text-sm text-neutral-500">Roster →</span>
                </Link>
              </li>
            );
          })}
          {(sessions ?? []).length === 0 && (
            <p className="text-neutral-500">No sessions in the next two weeks yet.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
