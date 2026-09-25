"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSlot(formData: FormData) {
  const supabase = await createClient();

  const class_type_id = String(formData.get("class_type_id") ?? "");
  const day_of_week = Number(formData.get("day_of_week"));
  const start_time = String(formData.get("start_time") ?? "");
  const end_time = String(formData.get("end_time") ?? "");
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const coach_id = String(formData.get("coach_id") ?? "").trim();

  if (!class_type_id || !start_time || !end_time || Number.isNaN(day_of_week)) {
    return { error: "Class type, day, start and end time are required" };
  }

  const { error } = await supabase.from("class_schedule").insert({
    class_type_id,
    day_of_week,
    start_time,
    end_time,
    capacity: capacityRaw ? Number(capacityRaw) : null,
    location: location || null,
    coach_id: coach_id || null,
  });

  revalidatePath("/admin/template");
  if (error) return { error: error.message };
  return { error: null };
}

export async function toggleActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("class_schedule").update({ active }).eq("id", id);
  revalidatePath("/admin/template");
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteSlot(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("class_schedule").delete().eq("id", id);
  revalidatePath("/admin/template");
  if (error) return { error: error.message };
  return { error: null };
}
