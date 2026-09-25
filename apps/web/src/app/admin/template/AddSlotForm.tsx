"use client";

import { useActionState, useRef } from "react";
import { createSlot } from "./actions";

type State = { error: string | null };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function AddSlotForm({
  classTypes,
  coaches,
}: {
  classTypes: { id: string; name: string }[];
  coaches: { id: string; full_name: string | null; email: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const result = await createSlot(formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    { error: null }
  );

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Class type
        <select name="class_type_id" required className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          {classTypes.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {ct.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Day
        <select name="day_of_week" required className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          {DAYS.map((day, i) => (
            <option key={day} value={i}>
              {day}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Start time
        <input type="time" name="start_time" required className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        End time
        <input type="time" name="end_time" required className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Capacity (optional)
        <input
          type="number"
          name="capacity"
          min={1}
          placeholder="class default"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Location (optional)
        <input type="text" name="location" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Coach (optional)
        <select name="coach_id" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">—</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name ?? c.email}
            </option>
          ))}
        </select>
      </label>

      <div className="col-span-2 flex items-end gap-3 sm:col-span-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add recurring slot"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
