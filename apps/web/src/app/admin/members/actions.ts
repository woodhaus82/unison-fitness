"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

async function requireStrictAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Only admins can manage members");

  return user.id;
}

export async function updateMemberRole(memberId: string, role: UserRole) {
  const supabase = await createClient();

  try {
    const currentUserId = await requireStrictAdmin();
    if (memberId === currentUserId) {
      return { error: "You can't change your own role" };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not authorized" };
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", memberId);
  revalidatePath("/admin/members");
  if (error) return { error: error.message };
  return { error: null };
}

// Fully deletes the member's auth account, which cascades to their
// profile, bookings, memberships and notification history — irreversible.
// Uses the service-role client because deleting an auth user requires the
// Supabase Auth admin API, not a regular table operation.
export async function deleteMember(memberId: string) {
  try {
    const currentUserId = await requireStrictAdmin();
    if (memberId === currentUserId) {
      return { error: "You can't delete your own account" };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not authorized" };
  }

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient.auth.admin.deleteUser(memberId);

  revalidatePath("/admin/members");
  if (error) return { error: error.message };
  return { error: null };
}
