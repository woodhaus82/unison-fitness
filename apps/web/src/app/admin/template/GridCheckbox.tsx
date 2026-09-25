"use client";

import { useState, useTransition } from "react";
import { toggleGridCell } from "./actions";

export function GridCheckbox({
  dayOfWeek,
  startTime,
  endTime,
  classTypeId,
  initialChecked,
}: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classTypeId: string;
  initialChecked: boolean;
}) {
  const [checked, setChecked] = useState(initialChecked);
  const [pending, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.checked;
        setChecked(next);
        startTransition(async () => {
          const result = await toggleGridCell(dayOfWeek, startTime, endTime, classTypeId, next);
          if (result.error) setChecked(!next);
        });
      }}
      className="h-4 w-4 disabled:opacity-50"
    />
  );
}
