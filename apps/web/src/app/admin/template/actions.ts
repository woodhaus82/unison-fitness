"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createClassType(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const default_capacity = Number(formData.get("default_capacity") ?? 12);
  const color = String(formData.get("color") ?? "").trim();

  if (!name) return { error: "Name is required" };

  const { error } = await supabase.from("class_types").insert({
    name,
    default_capacity: Number.isFinite(default_capacity) && default_capacity > 0 ? default_capacity : 12,
    color: color || null,
  });

  revalidatePath("/admin/template");
  if (error) return { error: error.message };
  return { error: null };
}

export async function updateClassType(
  id: string,
  fields: { name: string; default_capacity: number; color: string | null }
) {
  const supabase = await createClient();

  if (!fields.name.trim()) return { error: "Name is required" };
  if (!Number.isFinite(fields.default_capacity) || fields.default_capacity <= 0) {
    return { error: "Capacity must be a positive number" };
  }

  const { data: before } = await supabase.from("class_types").select("default_capacity").eq("id", id).single();

  const { error } = await supabase
    .from("class_types")
    .update({
      name: fields.name.trim(),
      default_capacity: fields.default_capacity,
      color: fields.color || null,
    })
    .eq("id", id);

  if (!error && before && before.default_capacity !== fields.default_capacity) {
    // Sessions snapshot their capacity from the default at generation
    // time, so a later default_capacity change doesn't retroactively
    // apply on its own. Propagate it to upcoming sessions that aren't
    // using an explicit per-slot capacity override.
    const { data: overridden } = await supabase
      .from("class_schedule")
      .select("id")
      .eq("class_type_id", id)
      .not("capacity", "is", null);

    let query = supabase
      .from("class_sessions")
      .update({ capacity: fields.default_capacity })
      .eq("class_type_id", id)
      .eq("status", "scheduled")
      .gte("session_date", new Date().toISOString().slice(0, 10));

    const overriddenIds = (overridden ?? []).map((s) => s.id);
    if (overriddenIds.length > 0) {
      query = query.not("schedule_id", "in", `(${overriddenIds.join(",")})`);
    }

    await query;
  }

  revalidatePath("/admin/template");
  revalidatePath("/schedule");
  if (error) return { error: error.message };
  return { error: null };
}

export async function createTimeSlot(formData: FormData) {
  const supabase = await createClient();

  const day_of_week = Number(formData.get("day_of_week"));
  const start_time = String(formData.get("start_time") ?? "");
  const end_time = String(formData.get("end_time") ?? "");

  if (Number.isNaN(day_of_week) || !start_time || !end_time) {
    return { error: "Day, start and end time are required" };
  }

  const { data: maxRow } = await supabase
    .from("time_slots")
    .select("sort_order")
    .eq("day_of_week", day_of_week)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("time_slots").insert({
    day_of_week,
    start_time,
    end_time,
    sort_order: (maxRow?.sort_order ?? 0) + 1,
  });

  revalidatePath("/admin/template");
  if (error) return { error: error.message };
  return { error: null };
}

export async function updateTimeSlot(id: string, start_time: string, end_time: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("time_slots").update({ start_time, end_time }).eq("id", id);
  revalidatePath("/admin/template");
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteTimeSlot(id: string) {
  const supabase = await createClient();

  const { data: slot } = await supabase
    .from("time_slots")
    .select("day_of_week, start_time, end_time")
    .eq("id", id)
    .single();

  if (slot) {
    // A deleted slot shouldn't leave orphaned recurring class entries that
    // no longer show up anywhere to manage.
    await supabase
      .from("class_schedule")
      .delete()
      .eq("day_of_week", slot.day_of_week)
      .eq("start_time", slot.start_time)
      .eq("end_time", slot.end_time);
  }

  const { error } = await supabase.from("time_slots").delete().eq("id", id);
  revalidatePath("/admin/template");
  if (error) return { error: error.message };
  return { error: null };
}

// A time slot holds at most one class type at a time, so selecting one
// replaces whatever (if anything) was there before rather than adding to it.
export async function setSlotClassType(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  classTypeId: string | null,
  coachId: string | null = null
) {
  const supabase = await createClient();

  const { error: deleteErr } = await supabase
    .from("class_schedule")
    .delete()
    .eq("day_of_week", dayOfWeek)
    .eq("start_time", startTime)
    .eq("end_time", endTime);

  if (deleteErr) {
    revalidatePath("/admin/template");
    return { error: deleteErr.message };
  }

  if (classTypeId) {
    const { error } = await supabase.from("class_schedule").insert({
      class_type_id: classTypeId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      coach_id: coachId,
    });
    revalidatePath("/admin/template");
    revalidatePath("/schedule");
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/template");
  revalidatePath("/schedule");
  return { error: null };
}

// Updates just the coach on an existing slot, and propagates it onto
// upcoming already-generated sessions too (same reasoning as capacity:
// sessions snapshot coach_id at generation time, so it wouldn't otherwise
// update retroactively).
export async function setSlotCoach(dayOfWeek: number, startTime: string, endTime: string, coachId: string | null) {
  const supabase = await createClient();

  const { data: scheduleRow, error: fetchErr } = await supabase
    .from("class_schedule")
    .select("id")
    .eq("day_of_week", dayOfWeek)
    .eq("start_time", startTime)
    .eq("end_time", endTime)
    .maybeSingle();

  if (fetchErr) return { error: fetchErr.message };
  if (!scheduleRow) return { error: "Pick a class type for this slot first" };

  const { error } = await supabase.from("class_schedule").update({ coach_id: coachId }).eq("id", scheduleRow.id);

  if (!error) {
    await supabase
      .from("class_sessions")
      .update({ coach_id: coachId })
      .eq("schedule_id", scheduleRow.id)
      .eq("status", "scheduled")
      .gte("session_date", new Date().toISOString().slice(0, 10));
  }

  revalidatePath("/admin/template");
  revalidatePath("/schedule");
  revalidatePath("/admin/schedule");
  if (error) return { error: error.message };
  return { error: null };
}
