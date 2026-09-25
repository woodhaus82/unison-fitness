"use client";

import { useActionState } from "react";
import { bookSession, cancelBooking } from "@/app/(member)/schedule/actions";

type ActionState = { error: string | null };

export function BookButton({ sessionId, full }: { sessionId: string; full: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async () => bookSession(sessionId),
    { error: null }
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className={`rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
            full ? "bg-amber-600" : "bg-neutral-900"
          }`}
        >
          {pending ? "Booking…" : full ? "Join waitlist" : "Book"}
        </button>
      </form>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </div>
  );
}

export function CancelButton({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async () => cancelBooking(bookingId),
    { error: null }
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Cancelling…" : "Cancel"}
        </button>
      </form>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
