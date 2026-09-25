import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const isStaff = profile.role === "admin" || profile.role === "coach";

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/schedule">Schedule</Link>
            <Link href="/bookings">My bookings</Link>
            {isStaff && <Link href="/admin/schedule">Admin</Link>}
          </nav>
          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <span>{profile.full_name ?? profile.email}</span>
            <form action={signOut}>
              <button type="submit" className="underline">
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
