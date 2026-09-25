import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MemberRow } from "./MemberRow";

export default async function MembersPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/admin/schedule");

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("full_name");

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-semibold">Members</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Promote a member to admin or coach, or delete someone who&apos;s left the gym. Deleting removes their
          account, bookings and history permanently.
        </p>
      </section>

      <ul className="flex flex-col gap-2">
        {(members ?? []).map((m) => (
          <MemberRow
            key={m.id}
            id={m.id}
            fullName={m.full_name}
            email={m.email}
            role={m.role}
            isSelf={m.id === profile.id}
          />
        ))}
        {(members ?? []).length === 0 && <p className="text-neutral-400">No members yet.</p>}
      </ul>
    </div>
  );
}
