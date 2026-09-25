import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/admin/schedule">Schedule</Link>
            <Link href="/admin/workouts">Workouts</Link>
            <Link href="/admin/template">Recurring template</Link>
            <Link href="/schedule">Member view</Link>
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
      <div className="mx-auto max-w-4xl px-6 py-8">{children}</div>
    </div>
  );
}
