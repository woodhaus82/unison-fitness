"use client";

import { useState, useTransition } from "react";
import { updateBenchmark, deleteBenchmark } from "./actions";

const SCORE_TYPE_LABEL: Record<string, string> = { time: "Time", reps: "Reps", weight: "Weight" };

export function BenchmarkRow({
  id,
  initialName,
  initialDescription,
  scoreType,
}: {
  id: string;
  initialName: string;
  initialDescription: string | null;
  scoreType: string;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  function save() {
    startTransition(async () => {
      const result = await updateBenchmark(id, { name, description: description || null });
      setError(result.error);
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${initialName}"? Members' logged results for it will be deleted too.`)) return;
    startTransition(async () => {
      const result = await deleteBenchmark(id);
      if (result.error) setError(result.error);
      else setDeleted(true);
    });
  }

  if (deleted) return null;

  return (
    <li className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={save}
        placeholder="Description"
        className="min-w-0 flex-[2] rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <span className="shrink-0 text-xs text-neutral-500">{SCORE_TYPE_LABEL[scoreType] ?? scoreType}</span>
      <button
        type="button"
        disabled={pending}
        onClick={handleDelete}
        className="shrink-0 text-xs text-red-600 underline disabled:opacity-50"
      >
        Delete
      </button>
      {error && <span className="shrink-0 text-xs text-red-600">{error}</span>}
    </li>
  );
}
