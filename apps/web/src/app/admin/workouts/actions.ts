"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Applies one workout to every session of this class type on this date,
// regardless of how many time slots run that day — the common case is
// the same WOD across all of a day's classes, not one per time slot.
export async function setDayWod(classTypeId: string, sessionDate: string, wod: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("class_sessions")
    .update({ wod: wod.trim() || null })
    .eq("class_type_id", classTypeId)
    .eq("session_date", sessionDate);

  revalidatePath("/admin/workouts");
  revalidatePath("/schedule");
  if (error) return { error: error.message };
  return { error: null };
}
