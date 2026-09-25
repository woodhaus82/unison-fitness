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

  const { error } = await supabase
    .from("class_types")
    .update({
      name: fields.name.trim(),
      default_capacity: fields.default_capacity,
      color: fields.color || null,
    })
    .eq("id", id);

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

export async function toggleGridCell(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  classTypeId: string,
  ticked: boolean
) {
  const supabase = await createClient();

  if (ticked) {
    const { error } = await supabase.from("class_schedule").insert({
      class_type_id: classTypeId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
    });
    revalidatePath("/admin/template");
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("class_schedule")
      .delete()
      .eq("class_type_id", classTypeId)
      .eq("day_of_week", dayOfWeek)
      .eq("start_time", startTime)
      .eq("end_time", endTime);
    revalidatePath("/admin/template");
    if (error) return { error: error.message };
  }

  return { error: null };
}
