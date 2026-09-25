"use client";

import { useActionState, useRef } from "react";
import { createBenchmark } from "./actions";

type State = { error: string | null };

export function AddBenchmarkForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const result = await createBenchmark(formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    { error: null }
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Name
        <input type="text" name="name" required placeholder="e.g. Fran" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Category
        <select name="category" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="wod">WOD</option>
          <option value="lift">Lift</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Scored by
        <select name="score_type" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="time">Time (faster is better)</option>
          <option value="reps">Reps (more is better)</option>
          <option value="weight">Weight (more is better)</option>
        </select>
      </label>
      <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm font-medium">
        Description
        <input type="text" name="description" placeholder="e.g. 21-15-9 Thrusters, Pull-ups" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-black hover:bg-brand-hover disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add benchmark"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
