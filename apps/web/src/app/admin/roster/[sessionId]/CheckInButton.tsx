"use client";

import { useActionState } from "react";
import { checkIn } from "./actions";

type State = { error: string | null };

export function CheckInButton({ bookingId, sessionId }: { bookingId: string; sessionId: string }) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async () => checkIn(bookingId, sessionId),
    { error: null }
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-black hover:bg-brand-hover disabled:opacity-50"
      >
        {pending ? "…" : "Check in"}
      </button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
