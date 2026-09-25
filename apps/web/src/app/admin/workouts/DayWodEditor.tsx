"use client";

import { useState, useTransition } from "react";
import { setDayWod } from "./actions";

export function DayWodEditor({
  classTypeId,
  sessionDate,
  initialWod,
  sessionCount,
}: {
  classTypeId: string;
  sessionDate: string;
  initialWod: string;
  sessionCount: number;
}) {
  const [value, setValue] = useState(initialWod);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      const result = await setDayWod(classTypeId, sessionDate, value);
      setError(result.error);
      setSaved(!result.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <textarea
        rows={3}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        onBlur={save}
        placeholder="Leave blank for no workout posted"
        className="rounded-md border border-neutral-700 px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-2 text-xs text-neutral-400">
        {sessionCount > 1 && <span>Applies to all {sessionCount} classes that day</span>}
        {pending && <span>Saving…</span>}
        {saved && !pending && <span className="text-green-400">Saved</span>}
        {error && <span className="text-red-400">{error}</span>}
      </div>
    </div>
  );
}
