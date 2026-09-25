"use client";

import { useState, useTransition } from "react";
import { setSlotClassType, setSlotCoach } from "./actions";

export function GridRowCells({
  dayOfWeek,
  startTime,
  endTime,
  classTypes,
  coaches,
  initialSelected,
  initialCoachId,
}: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classTypes: { id: string; name: string }[];
  coaches: { id: string; full_name: string | null; email: string }[];
  initialSelected: string | null;
  initialCoachId: string | null;
}) {
  const [selected, setSelected] = useState(initialSelected);
  const [coachId, setCoachId] = useState(initialCoachId);
  const [pending, startTransition] = useTransition();
  const groupName = `slot-${dayOfWeek}-${startTime}-${endTime}`;

  function choose(classTypeId: string | null) {
    const previous = selected;
    setSelected(classTypeId);
    startTransition(async () => {
      const result = await setSlotClassType(dayOfWeek, startTime, endTime, classTypeId, coachId);
      if (result.error) setSelected(previous);
      if (!classTypeId) setCoachId(null);
    });
  }

  function chooseCoach(nextCoachId: string | null) {
    const previous = coachId;
    setCoachId(nextCoachId);
    startTransition(async () => {
      const result = await setSlotCoach(dayOfWeek, startTime, endTime, nextCoachId);
      if (result.error) setCoachId(previous);
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
      <td className="px-2 py-1">
        <select
          value={coachId ?? ""}
          disabled={pending || !selected}
          onChange={(e) => chooseCoach(e.target.value || null)}
          className="w-full rounded border border-neutral-700 px-1 py-0.5 text-sm disabled:opacity-50"
        >
          <option value="">—</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name ?? c.email}
            </option>
          ))}
        </select>
      </td>
    </>
  );
}
