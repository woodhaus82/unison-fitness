"use server";

import { revalidatePath } from "next/cache";
import { startOfWeek, formatISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";

export async function generateThisWeek() {
  const supabase = await createClient();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const { data, error } = await supabase.rpc("generate_sessions_from_schedule", {
    p_week_start: formatISO(weekStart, { representation: "date" }),
  });
  revalidatePath("/admin/schedule");
  revalidatePath("/schedule");
  if (error) return { error: error.message, count: 0 };
  return { error: null, count: data?.length ?? 0 };
}
