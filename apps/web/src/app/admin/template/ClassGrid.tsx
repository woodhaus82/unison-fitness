import { createClient } from "@/lib/supabase/server";
import { TimeSlotRow } from "./TimeSlotRow";
import { GridCheckbox } from "./GridCheckbox";
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

  const [{ data: timeSlots }, { data: classTypes }, { data: scheduleRows }] = await Promise.all([
    supabase
      .from("time_slots")
      .select("id, day_of_week, start_time, end_time, sort_order")
      .order("day_of_week")
      .order("sort_order"),
    supabase.from("class_types").select("id, name").order("name"),
    supabase.from("class_schedule").select("class_type_id, day_of_week, start_time, end_time"),
  ]);

  const ticked = new Set(
    (scheduleRows ?? []).map((r) => `${r.day_of_week}|${r.start_time}|${r.end_time}|${r.class_type_id}`)
  );

  const slotsByDay = new Map<number, NonNullable<typeof timeSlots>>();
  for (const slot of timeSlots ?? []) {
    if (!slotsByDay.has(slot.day_of_week)) slotsByDay.set(slot.day_of_week, []);
    slotsByDay.get(slot.day_of_week)!.push(slot);
  }

  if ((classTypes ?? []).length === 0) {
    return <p className="text-neutral-500">Add a class type above before building the grid.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {DAY_ORDER.map((day) => {
        const slots = slotsByDay.get(day) ?? [];
        return (
          <div key={day}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{DAY_LABELS[day]}</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-neutral-500">
                    <th className="py-1 pr-3 font-medium">Time</th>
                    {(classTypes ?? []).map((ct) => (
                      <th key={ct.id} className="px-2 py-1 text-center font-medium">
                        {ct.name}
                      </th>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <TimeSlotRow key={slot.id} id={slot.id} initialStart={slot.start_time} initialEnd={slot.end_time}>
                      {(classTypes ?? []).map((ct) => (
                        <td key={ct.id} className="px-2 py-1 text-center">
                          <GridCheckbox
                            dayOfWeek={day}
                            startTime={slot.start_time}
                            endTime={slot.end_time}
                            classTypeId={ct.id}
                            initialChecked={ticked.has(`${day}|${slot.start_time}|${slot.end_time}|${ct.id}`)}
                          />
                        </td>
                      ))}
                    </TimeSlotRow>
                  ))}
                </tbody>
              </table>
              {slots.length === 0 && <p className="py-1 text-sm text-neutral-500">No time slots yet for this day.</p>}
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
