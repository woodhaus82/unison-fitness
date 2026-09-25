import { createClient } from "@/lib/supabase/server";
import { AddSlotForm } from "./AddSlotForm";
import { SlotActions } from "./SlotActions";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function TemplatePage() {
  const supabase = await createClient();

  const [{ data: slots }, { data: classTypes }, { data: coaches }] = await Promise.all([
    supabase
      .from("class_schedule")
      .select("id, day_of_week, start_time, end_time, capacity, location, active, class_types(name), profiles(full_name, email)")
      .order("day_of_week")
      .order("start_time"),
    supabase.from("class_types").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name, email").in("role", ["admin", "coach"]).order("full_name"),
  ]);

  const byDay = new Map<number, NonNullable<typeof slots>>();
  for (const s of slots ?? []) {
    if (!byDay.has(s.day_of_week)) byDay.set(s.day_of_week, []);
    byDay.get(s.day_of_week)!.push(s);
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-semibold">Recurring weekly template</h1>
        <p className="mt-1 text-sm text-neutral-500">
          This is the pattern &quot;Generate this week&quot; stamps out into real sessions. Editing it doesn&apos;t
          change sessions already generated — regenerate or re-import to apply changes to an upcoming week.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Add a slot</h2>
        <div className="mt-4">
          <AddSlotForm classTypes={classTypes ?? []} coaches={coaches ?? []} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Current template</h2>
        <div className="mt-4 flex flex-col gap-6">
          {DAYS.map((day, i) => {
            const daySlots = byDay.get(i) ?? [];
            if (daySlots.length === 0) return null;
            return (
              <div key={day}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{day}</h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {daySlots.map((s) => {
                    const classType = Array.isArray(s.class_types) ? s.class_types[0] : s.class_types;
                    const coach = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
                    return (
                      <li
                        key={s.id}
                        className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                          s.active ? "border-neutral-200" : "border-neutral-200 opacity-50"
                        }`}
                      >
                        <div>
                          <p className="font-medium">
                            {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} · {classType?.name ?? "Class"}
                            {!s.active && " (inactive)"}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {s.capacity ? `Capacity ${s.capacity}` : "Default capacity"}
                            {s.location ? ` · ${s.location}` : ""}
                            {coach ? ` · ${coach.full_name ?? coach.email}` : ""}
                          </p>
                        </div>
                        <SlotActions id={s.id} active={s.active} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {(slots ?? []).length === 0 && <p className="text-neutral-500">No recurring slots yet — add one above.</p>}
        </div>
      </section>
    </div>
  );
}
