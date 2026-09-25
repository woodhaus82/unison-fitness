import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseCsvText,
  parseXlsxBuffer,
  normalizeGoogleSheetsUrl,
  type ScheduleRow,
} from "@/lib/scheduleImport";
import type { UploadSource } from "@/lib/types/database";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile.role !== "admin" && profile.role !== "coach")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let rows: ScheduleRow[] = [];
  let errors: { row: number; message: string }[] = [];
  let sourceType: UploadSource;
  let fileName: string | null = null;

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      fileName = file.name;

      if (file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")) {
        sourceType = "xlsx";
        const result = parseXlsxBuffer(await file.arrayBuffer());
        rows = result.rows;
        errors = result.errors;
      } else {
        sourceType = "csv";
        const result = parseCsvText(await file.text());
        rows = result.rows;
        errors = result.errors;
      }
    } else {
      const body = await request.json();
      const sheetUrl = body?.sheet_url as string | undefined;
      if (!sheetUrl) {
        return NextResponse.json({ error: "No file or sheet_url provided" }, { status: 400 });
      }
      sourceType = "google_sheets";
      fileName = sheetUrl;

      const csvUrl = normalizeGoogleSheetsUrl(sheetUrl);
      const res = await fetch(csvUrl);
      if (!res.ok) {
        return NextResponse.json(
          { error: `Could not fetch the sheet (HTTP ${res.status}). Make sure it's published/shared publicly.` },
          { status: 400 }
        );
      }
      const result = parseCsvText(await res.text());
      rows = result.rows;
      errors = result.errors;
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to parse file: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 400 }
    );
  }

  if (errors.length > 0) {
    await supabase.from("schedule_uploads").insert({
      uploaded_by: user.id,
      source_type: sourceType,
      file_name: fileName,
      row_count: rows.length,
      status: "failed",
      error_message: errors.map((e) => `Row ${e.row}: ${e.message}`).join("\n"),
    });
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows found in file" }, { status: 400 });
  }

  // Resolve class type names -> ids, creating new class types as needed.
  const { data: existingTypes } = await supabase.from("class_types").select("id, name, default_capacity");
  const typeByName = new Map((existingTypes ?? []).map((t) => [t.name.toLowerCase(), t]));

  const missingTypeNames = [...new Set(rows.map((r) => r.class_type.toLowerCase()))].filter(
    (name) => !typeByName.has(name)
  );
  if (missingTypeNames.length > 0) {
    const { data: created, error: createErr } = await supabase
      .from("class_types")
      .insert(missingTypeNames.map((name) => ({ name: rows.find((r) => r.class_type.toLowerCase() === name)!.class_type })))
      .select("id, name, default_capacity");
    if (createErr) {
      return NextResponse.json({ error: `Failed to create class types: ${createErr.message}` }, { status: 500 });
    }
    for (const t of created ?? []) typeByName.set(t.name.toLowerCase(), t);
  }

  // Resolve coach emails -> profile ids.
  const coachEmails = [...new Set(rows.map((r) => r.coach_email).filter((e): e is string => !!e))];
  const coachByEmail = new Map<string, string>();
  if (coachEmails.length > 0) {
    const { data: coaches } = await supabase.from("profiles").select("id, email").in("email", coachEmails);
    for (const c of coaches ?? []) coachByEmail.set(c.email.toLowerCase(), c.id);
  }

  const sessionsToUpsert = rows.map((row) => {
    const classType = typeByName.get(row.class_type.toLowerCase())!;
    return {
      class_type_id: classType.id,
      session_date: row.date,
      start_time: row.start_time,
      end_time: row.end_time,
      capacity: row.capacity ?? classType.default_capacity,
      coach_id: row.coach_email ? coachByEmail.get(row.coach_email.toLowerCase()) ?? null : null,
      location: row.location || null,
    };
  });

  const { error: upsertErr } = await supabase
    .from("class_sessions")
    .upsert(sessionsToUpsert, { onConflict: "class_type_id,session_date,start_time" });

  // Applied as a separate pass, one row at a time, so rows that don't
  // specify a wod never overwrite an existing one set via the admin UI —
  // a single batched upsert can't safely express "leave this column alone
  // for some rows but set it for others."
  if (!upsertErr) {
    for (const row of rows) {
      if (!row.wod) continue;
      const classType = typeByName.get(row.class_type.toLowerCase())!;
      await supabase
        .from("class_sessions")
        .update({ wod: row.wod })
        .eq("class_type_id", classType.id)
        .eq("session_date", row.date)
        .eq("start_time", row.start_time);
    }
  }

  await supabase.from("schedule_uploads").insert({
    uploaded_by: user.id,
    source_type: sourceType,
    file_name: fileName,
    row_count: rows.length,
    status: upsertErr ? "failed" : "completed",
    error_message: upsertErr?.message ?? null,
  });

  if (upsertErr) {
    return NextResponse.json({ error: `Failed to save sessions: ${upsertErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, sessionsImported: sessionsToUpsert.length });
}
