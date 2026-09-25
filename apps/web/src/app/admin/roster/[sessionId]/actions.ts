"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function checkIn(bookingId: string, sessionId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status: "attended", checked_in_at: new Date().toISOString() })
    .eq("id", bookingId);
  revalidatePath(`/admin/roster/${sessionId}`);
  if (error) return { error: error.message };
  return { error: null };
}

export async function updateWod(sessionId: string, wod: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("class_sessions")
    .update({ wod: wod.trim() || null })
    .eq("id", sessionId);
  revalidatePath(`/admin/roster/${sessionId}`);
  revalidatePath("/schedule");
  if (error) return { error: error.message };
  return { error: null };
}
