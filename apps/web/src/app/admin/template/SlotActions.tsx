"use client";

import { useActionState } from "react";
import { toggleActive, deleteSlot } from "./actions";

type State = { error: string | null };

export function SlotActions({ id, active }: { id: string; active: boolean }) {
  const [toggleState, toggleFormAction, togglePending] = useActionState<State, FormData>(
    async () => toggleActive(id, !active),
    { error: null }
  );
  const [deleteState, deleteFormAction, deletePending] = useActionState<State, FormData>(
    async () => deleteSlot(id),
    { error: null }
  );

  return (
    <div className="flex items-center gap-2">
      <form action={toggleFormAction}>
        <button
          type="submit"
          disabled={togglePending}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {active ? "Deactivate" : "Activate"}
        </button>
      </form>
      <form
        action={deleteFormAction}
        onSubmit={(e) => {
          if (!confirm("Delete this recurring slot? This won't affect sessions already generated from it.")) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          disabled={deletePending}
          className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-50"
        >
          Delete
        </button>
      </form>
      {(toggleState.error || deleteState.error) && (
        <p className="text-xs text-red-600">{toggleState.error ?? deleteState.error}</p>
      )}
    </div>
  );
}
