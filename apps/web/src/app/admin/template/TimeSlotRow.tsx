"use client";

import { useState, useTransition } from "react";
import { updateTimeSlot, deleteTimeSlot } from "./actions";

export function TimeSlotRow({
  id,
  initialStart,
  initialEnd,
  children,
}: {
  id: string;
  initialStart: string;
  initialEnd: string;
  children: React.ReactNode;
}) {
  const [start, setStart] = useState(initialStart.slice(0, 5));
  const [end, setEnd] = useState(initialEnd.slice(0, 5));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(newStart: string, newEnd: string) {
    startTransition(async () => {
      const result = await updateTimeSlot(id, newStart, newEnd);
      setError(result.error);
    });
  }

  return (
    <tr className="border-t border-neutral-100">
      <td className="py-1.5 pr-3">
        <div className="flex items-center gap-1">
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            onBlur={() => save(start, end)}
            className="w-24 rounded border border-neutral-300 px-1 py-0.5 text-sm"
          />
          <span className="text-neutral-400">–</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            onBlur={() => save(start, end)}
            className="w-24 rounded border border-neutral-300 px-1 py-0.5 text-sm"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </td>
      {children}
      <td className="py-1.5 pl-3 text-right">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (
              confirm(
                "Delete this time slot? Any class types ticked onto it will be removed from the template too."
              )
            ) {
              startTransition(async () => {
                await deleteTimeSlot(id);
              });
            }
          }}
          className="text-xs text-red-600 underline disabled:opacity-50"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
