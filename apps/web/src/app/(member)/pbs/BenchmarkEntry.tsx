"use client";

import { useActionState, useRef, useState } from "react";
import { logResult, deleteResult } from "./actions";
import { formatScore } from "@/lib/pb-format";
import type { BenchmarkScoreType } from "@/lib/types/database";

type Entry = { id: string; value: number; rx: boolean; notes: string | null; recorded_date: string };

type State = { error: string | null };

export function BenchmarkEntry({
  benchmarkId,
  name,
  description,
  scoreType,
  entries,
}: {
  benchmarkId: string;
  name: string;
  description: string | null;
  scoreType: BenchmarkScoreType;
  entries: Entry[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const best = entries.reduce<Entry | null>((acc, e) => {
    if (!acc) return e;
    const better = scoreType === "time" ? e.value < acc.value : e.value > acc.value;
    return better ? e : acc;
  }, null);

  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const result = await logResult(formData);
      if (!result.error) {
        formRef.current?.reset();
        setShowForm(false);
      }
      return result;
    },
    { error: null }
  );

  return (
    <li className="rounded-lg border border-neutral-200 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{name}</p>
          {description && <p className="text-sm text-neutral-500">{description}</p>}
          {best ? (
            <p className="mt-1 text-sm text-green-700">
              PB: {formatScore(best.value, scoreType)} {best.rx ? "(Rx)" : "(Scaled)"}
            </p>
          ) : (
            <p className="mt-1 text-sm text-neutral-400">No result logged yet</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium"
        >
          {showForm ? "Cancel" : "Log result"}
        </button>
      </div>

      {showForm && (
        <form ref={formRef} action={formAction} className="mt-3 flex flex-col gap-2 border-t border-neutral-100 pt-3">
          <input type="hidden" name="benchmark_id" value={benchmarkId} />
          <input type="hidden" name="score_type" value={scoreType} />

          {scoreType === "time" ? (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-sm">
                <input type="number" name="minutes" min={0} required defaultValue={0} className="w-16 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
                min
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input type="number" name="seconds" min={0} max={59} required defaultValue={0} className="w-16 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
                sec
              </label>
            </div>
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="number"
                name="value"
                min={0}
                step={scoreType === "weight" ? 0.5 : 1}
                required
                className="w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
              {scoreType === "weight" ? "kg" : "reps"}
            </label>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="rx" defaultChecked />
            Rx (unchecked = Scaled)
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Date
            <input
              type="date"
              name="recorded_date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-40 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Notes (optional)
            <input type="text" name="notes" placeholder="e.g. weight used, how it felt" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="mt-1 self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save result"}
          </button>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        </form>
      )}

      {entries.length > 0 && (
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="mt-2 text-sm font-medium text-neutral-600 underline"
        >
          {showHistory ? "Hide history" : `History (${entries.length})`}
        </button>
      )}

      {showHistory && (
        <ul className="mt-2 flex flex-col gap-1">
          {entries.map((e) => (
            <HistoryRow key={e.id} entry={e} scoreType={scoreType} />
          ))}
        </ul>
      )}
    </li>
  );
}

function HistoryRow({ entry, scoreType }: { entry: Entry; scoreType: BenchmarkScoreType }) {
  const [deleted, setDeleted] = useState(false);
  const [pending, setPending] = useState(false);

  if (deleted) return null;

  return (
    <li className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2 text-sm">
      <span>
        {entry.recorded_date} · {formatScore(entry.value, scoreType)} · {entry.rx ? "Rx" : "Scaled"}
        {entry.notes ? ` · ${entry.notes}` : ""}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const result = await deleteResult(entry.id);
          setPending(false);
          if (!result.error) setDeleted(true);
        }}
        className="shrink-0 text-xs text-red-600 underline disabled:opacity-50"
      >
        Delete
      </button>
    </li>
  );
}
