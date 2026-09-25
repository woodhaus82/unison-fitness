import type { NotificationType } from "@/lib/types/database";

export interface EmailContext {
  memberName: string | null;
  className: string;
  sessionDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
}

export function buildEmail(type: NotificationType, ctx: EmailContext): { subject: string; html: string } | null {
  const name = ctx.memberName ?? "there";
  const when = `${ctx.className} on ${formatDate(ctx.sessionDate)} at ${ctx.startTime.slice(0, 5)}`;

  switch (type) {
    case "booking_confirmation":
      return {
        subject: `You're booked in: ${ctx.className}`,
        html: `<p>Hi ${name},</p><p>You're confirmed for ${when}.</p><p>See you on the floor!</p>`,
      };
    case "waitlist_promoted":
      return {
        subject: `A spot opened up: ${ctx.className}`,
        html: `<p>Hi ${name},</p><p>A spot opened up and you've been moved off the waitlist into ${when}.</p>`,
      };
    case "late_cancellation":
      return {
        subject: `Late cancellation recorded: ${ctx.className}`,
        html: `<p>Hi ${name},</p><p>We've recorded a late cancellation for ${when}. Cancellations inside the cut-off window may count against your membership — reach out if you think this is a mistake.</p>`,
      };
    case "missed_attendance":
      return {
        subject: `We missed you: ${ctx.className}`,
        html: `<p>Hi ${name},</p><p>You were booked into ${when} but weren't checked in. If you couldn't make it, no worries — just remember to cancel next time so someone else can take the spot.</p>`,
      };
    case "class_cancelled":
      return {
        subject: `Class cancelled: ${ctx.className}`,
        html: `<p>Hi ${name},</p><p>Unfortunately ${when} has been cancelled. Sorry for the short notice.</p>`,
      };
    default:
      return null;
  }
}

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
