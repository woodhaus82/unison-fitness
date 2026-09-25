"use client";

import { useActionState, useState } from "react";
import { updateWod } from "./actions";

type State = { error: string | null };

export function WodEditor({ sessionId, initialWod }: { sessionId: string; initialWod: string | null }) {
  const [value, setValue] = useState(initialWod ?? "");
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => updateWod(sessionId, String(formData.get("wod") ?? "")),
    { error: null }
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-2">
      <label className="text-sm font-medium" htmlFor="wod">
        WOD / workout for this session
      </label>
      <textarea
        id="wod"
        name="wod"
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={"e.g.\n5 rounds for time:\n10 pull-ups\n15 push-ups\n20 air squats"}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-brand px-5 py-2 text-sm font-semibold text-black hover:bg-brand-hover disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save WOD"}
        </button>
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
