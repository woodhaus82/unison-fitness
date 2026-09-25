import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { buildEmail } from "@/lib/email/templates";

// Invoked by an external scheduler every few minutes. Drains the
// notification_log outbox: for every un-emailed row (booking confirmed,
// waitlist promotion, late cancellation, missed attendance, class
// cancelled) it sends the corresponding email and stamps emailed_at so it
// is never sent twice.
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
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: pending, error } = await supabase
    .from("notification_log")
    .select(
      "id, type, user_id, profiles(email, full_name), bookings(class_sessions(session_date, start_time, class_types(name)))"
    )
    .is("emailed_at", null)
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const row of pending ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const booking = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings;
    const session = booking ? (Array.isArray(booking.class_sessions) ? booking.class_sessions[0] : booking.class_sessions) : null;
    const classType = session ? (Array.isArray(session.class_types) ? session.class_types[0] : session.class_types) : null;

    if (!profile?.email || !session || !classType) {
      // Nothing sensible to email (e.g. booking/session was deleted since);
      // mark it handled so it doesn't block the queue forever.
      await supabase.from("notification_log").update({ emailed_at: new Date().toISOString() }).eq("id", row.id);
      continue;
    }

    const email = buildEmail(row.type, {
      memberName: profile.full_name,
      className: classType.name,
      sessionDate: session.session_date,
      startTime: session.start_time,
    });

    if (!email) {
      await supabase.from("notification_log").update({ emailed_at: new Date().toISOString() }).eq("id", row.id);
      continue;
    }

    const { error: sendError } = await resend.emails.send({
      from: process.env.NOTIFICATIONS_FROM_EMAIL ?? "Unison Fitness <notifications@unison.fitness>",
      to: profile.email,
      subject: email.subject,
      html: email.html,
    });

    if (sendError) {
      failed++;
      continue;
    }

    await supabase.from("notification_log").update({ emailed_at: new Date().toISOString() }).eq("id", row.id);
    sent++;
  }

  return NextResponse.json({ sent, failed, pending: pending?.length ?? 0 });
}

export const GET = handler;
export const POST = handler;
