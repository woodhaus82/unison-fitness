"use client";

import { useActionState } from "react";
import { cancelSession } from "./actions";

type State = { error: string | null };

export function CancelSessionButton({ sessionId, bookingCount }: { sessionId: string; bookingCount: number }) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async () => (await cancelSession(sessionId)) ?? { error: null },
    { error: null }
  );

  const confirmMessage =
    bookingCount > 0
      ? `Cancel this session? ${bookingCount} member${bookingCount === 1 ? " is" : "s are"} booked in and will be emailed that it's cancelled.`
      : "Delete this session? Nobody is booked in, so it'll be removed entirely.";

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-red-900 px-4 py-2 text-sm font-medium text-red-400 disabled:opacity-50"
      >
        {pending ? "Cancelling…" : bookingCount > 0 ? "Cancel session" : "Delete session"}
      </button>
      {state.error && <p className="mt-1 text-xs text-red-400">{state.error}</p>}
    </form>
  );
}
