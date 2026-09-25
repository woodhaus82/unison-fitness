import Image from "next/image";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { selectPlan } from "./actions";

// Trial → pack → unlimited: lowest commitment first, matching a typical
// signup/pricing page rather than membership_plans' insertion order.
const DISPLAY_ORDER = ["trial", "session_pack", "monthly_unlimited"];

function formatPrice(cents: number | null) {
  if (cents === null) return "";
  return `£${(cents / 100).toFixed(2)}`;
}

export default async function ChoosePlanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await requireProfile();
  if (profile.role !== "member") redirect("/admin/schedule");

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", profile.id)
    .limit(1);
  if (existing && existing.length > 0) redirect("/schedule");

  const { data: plans } = await supabase
    .from("membership_plans")
    .select("id, name, description, type, credits_granted, duration_days, price_cents")
    .eq("active", true);

  const sortedPlans = [...(plans ?? [])].sort(
    (a, b) => DISPLAY_ORDER.indexOf(a.type) - DISPLAY_ORDER.indexOf(b.type)
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <Image src="/logo-white.png" alt="Unison Fitness" width={2434} height={528} className="mb-6 h-9 w-auto" priority />
      <h1 className="text-2xl font-semibold">Choose your plan</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Pick how you&apos;d like to train with us. You can only book classes once you&apos;ve got an active plan.
      </p>
      <p className="mt-4 rounded-md bg-amber-950 px-3 py-2 text-sm text-amber-400">
        Testing mode — payments aren&apos;t wired up yet, so selecting a plan grants it for free. This will require
        real payment once checkout goes live.
      </p>
      {error && <p className="mt-4 rounded-md bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>}

      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        {sortedPlans.map((plan) => (
          <form
            key={plan.id}
            action={selectPlan.bind(null, plan.id)}
            className="flex flex-1 flex-col rounded-lg border border-neutral-800 bg-neutral-900/60 p-5"
          >
            <h2 className="font-heading text-lg">{plan.name}</h2>
            <p className="mt-1 text-2xl font-semibold text-brand">{formatPrice(plan.price_cents)}</p>
            <p className="mt-2 flex-1 text-sm text-neutral-400">{plan.description}</p>
            <button
              type="submit"
              className="mt-4 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-black hover:bg-brand-hover"
            >
              Select
            </button>
          </form>
        ))}
        {sortedPlans.length === 0 && <p className="text-neutral-400">No plans available right now.</p>}
      </div>
    </main>
  );
}
