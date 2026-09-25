import type { MembershipPlanType } from "@/lib/types/database";

// Mirrors the priority order in the pick_membership_for_booking() SQL
// function: unlimited/trial access is reported before a session pack, and
// a plan's `status` column alone isn't authoritative for unlimited/trial
// types since nothing flips it to 'expired' once end_date passes — this
// computes the same "does this currently grant access" logic SQL does.
export type MembershipSummary =
  | { kind: "none" }
  | { kind: "monthly_unlimited"; isComp: boolean; endDate: string | null }
  | { kind: "trial"; endDate: string }
  | { kind: "session_pack"; creditsRemaining: number };

export type MembershipRow = {
  status: string;
  end_date: string | null;
  credits_remaining: number | null;
  is_comp: boolean;
  membership_plans: { type: MembershipPlanType } | { type: MembershipPlanType }[] | null;
};

function planType(m: MembershipRow): MembershipPlanType | undefined {
  return Array.isArray(m.membership_plans) ? m.membership_plans[0]?.type : m.membership_plans?.type;
}

export function summarizeMembership(memberships: MembershipRow[], todayUk: string): MembershipSummary {
  const active = memberships.filter((m) => m.status === "active");

  const unlimited = active.find(
    (m) => planType(m) === "monthly_unlimited" && (!m.end_date || m.end_date >= todayUk)
  );
  if (unlimited) {
    return { kind: "monthly_unlimited", isComp: unlimited.is_comp, endDate: unlimited.end_date };
  }

  const trial = active.find((m) => planType(m) === "trial" && !!m.end_date && m.end_date >= todayUk);
  if (trial) {
    return { kind: "trial", endDate: trial.end_date! };
  }

  const packCredits = active
    .filter((m) => planType(m) === "session_pack")
    .reduce((sum, m) => sum + Math.max(m.credits_remaining ?? 0, 0), 0);
  if (packCredits > 0) {
    return { kind: "session_pack", creditsRemaining: packCredits };
  }

  return { kind: "none" };
}
