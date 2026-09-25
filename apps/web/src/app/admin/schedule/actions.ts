"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// weekStartIso must be a Monday (YYYY-MM-DD), matching the calendar's
// week-start convention and generate_sessions_from_schedule()'s day offsets.
export async function generateWeek(weekStartIso: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_sessions_from_schedule", {
    p_week_start: weekStartIso,
  });
  revalidatePath("/admin/schedule");
  revalidatePath("/schedule");
  if (error) return { error: error.message, count: 0 };
  return { error: null, count: data?.length ?? 0 };
}
