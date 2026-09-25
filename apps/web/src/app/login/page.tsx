import Link from "next/link";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next = "/" } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="mt-1 text-sm text-neutral-500">Unison Fitness member portal</p>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
      )}

      <form action={signIn} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-md border border-neutral-300 px-3 py-2 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Password
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-neutral-300 px-3 py-2 text-base"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-full bg-brand px-4 py-2.5 font-semibold text-black hover:bg-brand-hover"
        >
          Log in
        </button>
      </form>

      <p className="mt-3 text-sm">
        <Link href="/forgot-password" className="font-medium text-neutral-900 underline">
          Forgot your password?
        </Link>
      </p>

      <p className="mt-6 text-sm text-neutral-500">
        New here?{" "}
        <Link href="/signup" className="font-medium text-neutral-900 underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
