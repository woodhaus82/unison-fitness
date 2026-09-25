"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BenchmarkCategory, BenchmarkScoreType } from "@/lib/types/database";

export async function createBenchmark(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "") as BenchmarkCategory;
  const score_type = String(formData.get("score_type") ?? "") as BenchmarkScoreType;
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return { error: "Name is required" };

  const { data: maxRow } = await supabase
    .from("benchmarks")
    .select("sort_order")
    .eq("category", category)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("benchmarks").insert({
    name,
    category,
    score_type,
    description: description || null,
    sort_order: (maxRow?.sort_order ?? 0) + 1,
  });

  revalidatePath("/admin/benchmarks");
  if (error) return { error: error.message };
  return { error: null };
}

export async function updateBenchmark(
  id: string,
  fields: { name: string; description: string | null }
) {
  const supabase = await createClient();
  if (!fields.name.trim()) return { error: "Name is required" };

  const { error } = await supabase
    .from("benchmarks")
    .update({ name: fields.name.trim(), description: fields.description })
    .eq("id", id);

  revalidatePath("/admin/benchmarks");
  revalidatePath("/pbs");
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteBenchmark(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("benchmarks").delete().eq("id", id);
  revalidatePath("/admin/benchmarks");
  if (error) return { error: error.message };
  return { error: null };
}
