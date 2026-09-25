import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
            <Link href="/admin/schedule" className="hover:text-brand">Schedule</Link>
            <Link href="/admin/workouts" className="hover:text-brand">Workouts</Link>
            <Link href="/admin/template" className="hover:text-brand">Recurring template</Link>
            <Link href="/admin/benchmarks" className="hover:text-brand">Benchmarks</Link>
            {profile.role === "admin" && <Link href="/admin/members" className="hover:text-brand">Members</Link>}
            <Link href="/schedule" className="hover:text-brand">Member view</Link>
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
      </header>
      <div className="mx-auto max-w-4xl px-6 py-8">{children}</div>
    </div>
  );
}
