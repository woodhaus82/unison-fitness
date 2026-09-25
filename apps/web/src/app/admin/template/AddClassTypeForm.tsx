"use client";

import { useActionState, useRef } from "react";
import { createClassType } from "./actions";

type State = { error: string | null };

export function AddClassTypeForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const result = await createClassType(formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    { error: null }
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Name
        <input
          type="text"
          name="name"
          required
          placeholder="e.g. Kids Class"
          className="rounded-md border border-neutral-700 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Default capacity
        <input
          type="number"
          name="default_capacity"
          min={1}
          defaultValue={12}
          className="w-28 rounded-md border border-neutral-700 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Colour (optional)
        <input type="color" name="color" defaultValue="#525252" className="h-9 w-14 rounded-md border border-neutral-700" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-black hover:bg-brand-hover disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add class type"}
      </button>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}
