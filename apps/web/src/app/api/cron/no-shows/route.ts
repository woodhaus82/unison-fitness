import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Invoked by an external scheduler (Vercel Cron / Supabase scheduled
// function / cron-job.org) a few times an hour. Marks bookings as no-show
// once their session has ended without a check-in; dispatch-emails then
// sends the "we missed you" email for each new no-show.
//
// Vercel Cron only sends GET requests, and auto-attaches
// `Authorization: Bearer $CRON_SECRET`; other schedulers can POST the same
// header manually, so both methods are supported.
async function handler(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("mark_no_shows");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ noShowsMarked: data?.length ?? 0 });
}

export const GET = handler;
export const POST = handler;
