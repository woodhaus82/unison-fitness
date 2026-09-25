"use client";

import { useState, useTransition } from "react";
import { setSlotClassType } from "./actions";

export function GridRowCells({
  dayOfWeek,
  startTime,
  endTime,
  classTypes,
  initialSelected,
}: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classTypes: { id: string; name: string }[];
  initialSelected: string | null;
}) {
  const [selected, setSelected] = useState(initialSelected);
  const [pending, startTransition] = useTransition();
  const groupName = `slot-${dayOfWeek}-${startTime}-${endTime}`;

  function choose(classTypeId: string | null) {
    const previous = selected;
    setSelected(classTypeId);
    startTransition(async () => {
      const result = await setSlotClassType(dayOfWeek, startTime, endTime, classTypeId);
      if (result.error) setSelected(previous);
    });
  }

  return (
    <>
      <td className="px-2 py-1 text-center">
        <label className="sr-only">Nothing scheduled</label>
        <input
          type="radio"
          name={groupName}
          checked={selected === null}
          disabled={pending}
          onChange={() => choose(null)}
          className="h-4 w-4 disabled:opacity-50"
        />
      </td>
      {classTypes.map((ct) => (
        <td key={ct.id} className="px-2 py-1 text-center">
          <label className="sr-only">{ct.name}</label>
          <input
            type="radio"
            name={groupName}
            checked={selected === ct.id}
            disabled={pending}
            onChange={() => choose(ct.id)}
            className="h-4 w-4 disabled:opacity-50"
          />
        </td>
      ))}
    </>
  );
}
