import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const isStaff = profile.role === "admin" || profile.role === "coach";

  // A member who's never had a membership row at all (brand new signup)
  // gets funneled to plan selection before they can see anything else —
  // covers every entry point (login redirect, direct URL, bookmark) in
  // one place rather than special-casing just the post-signup redirect.
  // Anyone whose membership has since expired/run out isn't caught by
  // this — that's a "renew" prompt, a different feature to this "you've
  // never had one" check.
  if (!isStaff) {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", profile.id)
      .limit(1);
    if (!existing || existing.length === 0) redirect("/choose-plan");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <Link href="/schedule" className="mb-3 block w-fit">
            <Image src="/logo-white.png" alt="Unison Fitness" width={2434} height={528} className="h-6 w-auto" priority />
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
              <Link href="/schedule" className="hover:text-brand">Schedule</Link>
              <Link href="/bookings" className="hover:text-brand">My bookings</Link>
              <Link href="/pbs" className="hover:text-brand">PBs</Link>
              {isStaff && <Link href="/admin/schedule" className="hover:text-brand">Admin</Link>}
            </nav>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-400">
              <span className="truncate">{profile.full_name ?? profile.email}</span>
              <form action={signOut}>
                <button type="submit" className="shrink-0 underline">
                  Log out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
