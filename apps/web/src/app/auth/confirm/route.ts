import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase's password-reset (and email-confirmation / magic-link) emails
// link here with a token_hash + type rather than a session directly, so
// the exchange can happen server-side and set an httpOnly cookie session.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(next);
    }
  }

  redirect(`/login?error=${encodeURIComponent("That link is invalid or has expired.")}`);
}
