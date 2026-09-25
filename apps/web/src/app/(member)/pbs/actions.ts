"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function logResult(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const benchmarkId = String(formData.get("benchmark_id") ?? "");
  const scoreType = String(formData.get("score_type") ?? "");
  const rx = formData.get("rx") === "on";
  const notes = String(formData.get("notes") ?? "").trim();
  const recordedDate = String(formData.get("recorded_date") ?? "");

  const value =
    scoreType === "time"
      ? Number(formData.get("minutes") ?? 0) * 60 + Number(formData.get("seconds") ?? 0)
      : Number(formData.get("value"));

  if (!benchmarkId || !Number.isFinite(value) || value <= 0) {
    return { error: "Enter a valid score" };
  }

  const { error } = await supabase.from("personal_bests").insert({
    user_id: user.id,
    benchmark_id: benchmarkId,
    value,
    rx,
    notes: notes || null,
    recorded_date: recordedDate || new Date().toISOString().slice(0, 10),
  });

  revalidatePath("/pbs");
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteResult(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("personal_bests").delete().eq("id", id);
  revalidatePath("/pbs");
  if (error) return { error: error.message };
  return { error: null };
}
