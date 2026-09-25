"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function bookSession(sessionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("book_class", { p_session_id: sessionId });
  revalidatePath("/schedule");
  revalidatePath("/bookings");
  if (error) return { error: error.message };
  return { error: null };
}

export async function cancelBooking(bookingId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
  revalidatePath("/schedule");
  revalidatePath("/bookings");
  if (error) return { error: error.message };
  return { error: null };
}
