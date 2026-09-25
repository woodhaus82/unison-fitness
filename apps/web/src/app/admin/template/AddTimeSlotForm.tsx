"use client";

import { useActionState, useRef } from "react";
import { createTimeSlot } from "./actions";

type State = { error: string | null };

export function AddTimeSlotForm({ dayOfWeek }: { dayOfWeek: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const result = await createTimeSlot(formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    { error: null }
  );

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2 text-sm">
      <input type="hidden" name="day_of_week" value={dayOfWeek} />
      <input type="time" name="start_time" required className="w-24 rounded border border-neutral-300 px-1 py-0.5" />
      <span className="text-neutral-400">–</span>
      <input type="time" name="end_time" required className="w-24 rounded border border-neutral-300 px-1 py-0.5" />
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-neutral-300 px-2 py-0.5 text-sm disabled:opacity-50"
      >
        {pending ? "Adding…" : "+ Add time"}
      </button>
      {state.error && <span className="text-red-600">{state.error}</span>}
    </form>
  );
}
