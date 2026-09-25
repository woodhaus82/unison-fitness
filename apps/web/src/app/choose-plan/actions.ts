"use server";

import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Grants the picked plan directly instead of going through Stripe (see
// select_membership_plan() in the DB — there's no payment integration
// yet, so this is how test members get access to exercise the rest of
// the app). The actual validation lives in that SECURITY DEFINER
// function, not here.
export async function selectPlan(planId: string) {
  const profile = await requireProfile();
  if (profile.role !== "member") redirect("/admin/schedule");

  const supabase = await createClient();
  const { error } = await supabase.rpc("select_membership_plan", { p_plan_id: planId });

  if (error) redirect("/choose-plan?error=" + encodeURIComponent(error.message));

  redirect("/schedule");
}
