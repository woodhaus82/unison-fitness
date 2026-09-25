import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const isStaff = profile.role === "admin" || profile.role === "coach";

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
            <Link href="/schedule" className="hover:text-brand">Schedule</Link>
            <Link href="/bookings" className="hover:text-brand">My bookings</Link>
            <Link href="/pbs" className="hover:text-brand">PBs</Link>
            {isStaff && <Link href="/admin/schedule" className="hover:text-brand">Admin</Link>}
          </nav>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
            <span className="truncate">{profile.full_name ?? profile.email}</span>
            <form action={signOut}>
              <button type="submit" className="shrink-0 underline">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
