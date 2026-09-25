"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent("Enter your email address")}`);
  }

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${protocol}://${host}/auth/confirm?next=/reset-password`,
  });

  // Always show the same message regardless of whether the email exists,
  // so this can't be used to enumerate registered accounts.
  redirect(
    `/forgot-password?message=${encodeURIComponent("If an account exists for that email, a reset link is on its way.")}`
  );
}
