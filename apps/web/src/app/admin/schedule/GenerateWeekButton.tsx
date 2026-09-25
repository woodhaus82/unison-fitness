"use client";

import { useActionState } from "react";
import { generateWeek } from "./actions";

type State = { error: string | null; count: number };

export function GenerateWeekButton({ weekStart, label }: { weekStart: string; label: string }) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async () => generateWeek(weekStart),
    { error: null, count: 0 }
  );

  return (
    <form action={formAction} className="flex items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Generating…" : label}
      </button>
      {state.count > 0 && <span className="text-sm text-green-700">{state.count} sessions ready</span>}
      {state.error && <span className="text-sm text-red-600">{state.error}</span>}
    </form>
  );
}
