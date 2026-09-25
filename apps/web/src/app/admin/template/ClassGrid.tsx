import { createClient } from "@/lib/supabase/server";
import { TimeSlotRow } from "./TimeSlotRow";
import { GridRowCells } from "./GridRowCells";
import { AddTimeSlotForm } from "./AddTimeSlotForm";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export async function ClassGrid() {
  const supabase = await createClient();

  const [{ data: timeSlots }, { data: classTypes }, { data: scheduleRows }, { data: coaches }] = await Promise.all([
    supabase
      .from("time_slots")
      .select("id, day_of_week, start_time, end_time, sort_order")
      .order("day_of_week")
      .order("sort_order"),
    supabase.from("class_types").select("id, name").order("name"),
    supabase.from("class_schedule").select("class_type_id, day_of_week, start_time, end_time, coach_id"),
    supabase.from("profiles").select("id, full_name, email").in("role", ["admin", "coach"]).order("full_name"),
  ]);

  // At most one class type per (day, time) slot; if legacy data ever has
  // more than one, the last one wins for display purposes.
  const selectedByCell = new Map<string, string>();
  const coachByCell = new Map<string, string | null>();
  for (const r of scheduleRows ?? []) {
    const key = `${r.day_of_week}|${r.start_time}|${r.end_time}`;
    selectedByCell.set(key, r.class_type_id);
    coachByCell.set(key, r.coach_id);
  }

  const slotsByDay = new Map<number, NonNullable<typeof timeSlots>>();
  for (const slot of timeSlots ?? []) {
    if (!slotsByDay.has(slot.day_of_week)) slotsByDay.set(slot.day_of_week, []);
    slotsByDay.get(slot.day_of_week)!.push(slot);
  }

  if ((classTypes ?? []).length === 0) {
    return <p className="text-neutral-400">Add a class type above before building the grid.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {DAY_ORDER.map((day) => {
        const slots = slotsByDay.get(day) ?? [];
        return (
          <div key={day}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">{DAY_LABELS[day]}</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-neutral-400">
                    <th className="py-1 pr-3 font-medium">Time</th>
                    <th className="px-2 py-1 text-center font-medium">—</th>
                    {(classTypes ?? []).map((ct) => (
                      <th key={ct.id} className="px-2 py-1 text-center font-medium">
                        {ct.name}
                      </th>
                    ))}
                    <th className="px-2 py-1 text-left font-medium">Coach</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <TimeSlotRow key={slot.id} id={slot.id} initialStart={slot.start_time} initialEnd={slot.end_time}>
                      <GridRowCells
                        dayOfWeek={day}
                        startTime={slot.start_time}
                        endTime={slot.end_time}
                        classTypes={classTypes ?? []}
                        coaches={coaches ?? []}
                        initialSelected={selectedByCell.get(`${day}|${slot.start_time}|${slot.end_time}`) ?? null}
                        initialCoachId={coachByCell.get(`${day}|${slot.start_time}|${slot.end_time}`) ?? null}
                      />
                    </TimeSlotRow>
                  ))}
                </tbody>
              </table>
              {slots.length === 0 && <p className="py-1 text-sm text-neutral-400">No time slots yet for this day.</p>}
            </div>
            <div className="mt-2">
              <AddTimeSlotForm dayOfWeek={day} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
