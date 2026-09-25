"use client";

import { useState, useTransition } from "react";
import { updateClassType } from "./actions";

export function ClassTypeRow({
  id,
  initialName,
  initialCapacity,
  initialColor,
}: {
  id: string;
  initialName: string;
  initialCapacity: number;
  initialColor: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [capacity, setCapacity] = useState(initialCapacity);
  const [color, setColor] = useState(initialColor ?? "#525252");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(next: { name: string; default_capacity: number; color: string }) {
    startTransition(async () => {
      const result = await updateClassType(id, next);
      setError(result.error);
    });
  }

  return (
    <li className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-2">
      <input
        type="color"
        value={color}
        onChange={(e) => {
          setColor(e.target.value);
          save({ name, default_capacity: capacity, color: e.target.value });
        }}
        className="h-8 w-10 shrink-0 rounded border border-neutral-300"
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => save({ name, default_capacity: capacity, color })}
        className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <label className="flex shrink-0 items-center gap-2 text-sm text-neutral-500">
        Capacity
        <input
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
          onBlur={() => save({ name, default_capacity: capacity, color })}
          className="w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </label>
      {pending && <span className="shrink-0 text-xs text-neutral-400">Saving…</span>}
      {error && <span className="shrink-0 text-xs text-red-600">{error}</span>}
    </li>
  );
}
