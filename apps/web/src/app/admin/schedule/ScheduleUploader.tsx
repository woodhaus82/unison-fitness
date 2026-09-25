"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ImportResult =
  | { success: true; sessionsImported: number }
  | { error: string; details?: { row: number; message: string }[] };

export function ScheduleUploader() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, setPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sheetUrlRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function submitFile(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    await runImport(() => fetch("/api/admin/import-schedule", { method: "POST", body: formData }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submitSheetUrl(e: React.FormEvent) {
    e.preventDefault();
    const url = sheetUrlRef.current?.value?.trim();
    if (!url) return;

    await runImport(() =>
      fetch("/api/admin/import-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet_url: url }),
      })
    );
  }

  async function runImport(doFetch: () => Promise<Response>) {
    setPending(true);
    setResult(null);
    try {
      const res = await doFetch();
      const body = await res.json();
      setResult(body);
      if (res.ok) router.refresh();
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submitFile} className="flex flex-col gap-2">
        <label className="text-sm font-medium">Upload CSV or XLSX</label>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            required
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Importing…" : "Import"}
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          Columns: date (YYYY-MM-DD), start_time, end_time, class_type, capacity (optional), coach_email (optional), location (optional), wod (optional).
        </p>
      </form>

      <form onSubmit={submitSheetUrl} className="flex flex-col gap-2">
        <label className="text-sm font-medium">Or import from Google Sheets</label>
        <div className="flex gap-2">
          <input
            ref={sheetUrlRef}
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            required
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Importing…" : "Import"}
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          The sheet must be shared as &quot;Anyone with the link can view&quot; (or published to the web). Same columns as above, first sheet tab is used.
        </p>
      </form>

      {result && "error" in result && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">{result.error}</p>
          {result.details && (
            <ul className="mt-2 list-disc pl-5">
              {result.details.map((d, i) => (
                <li key={i}>
                  Row {d.row}: {d.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result && "success" in result && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          Imported {result.sessionsImported} session{result.sessionsImported === 1 ? "" : "s"}.
        </div>
      )}
    </div>
  );
}
