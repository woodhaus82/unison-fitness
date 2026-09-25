import { requireProfile } from "@/lib/auth";
import { updatePassword } from "./actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireProfile();
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">Set a new password</h1>

      {error && (
        <p className="mt-4 rounded-md bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <form action={updatePassword} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          New password
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="rounded-md border border-neutral-700 px-3 py-2 text-base"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-full bg-brand px-4 py-2.5 font-semibold text-black hover:bg-brand-hover"
        >
          Update password
        </button>
      </form>
    </main>
  );
}
