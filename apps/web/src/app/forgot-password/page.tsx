import Image from "next/image";
import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <Image src="/logo-white.png" alt="Unison Fitness" width={2434} height={528} className="mb-6 h-9 w-auto" priority />
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <p className="mt-1 text-sm text-neutral-400">We&apos;ll email you a link to set a new one.</p>

      {error && (
        <p className="mt-4 rounded-md bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>
      )}
      {message && (
        <p className="mt-4 rounded-md bg-green-950 px-3 py-2 text-sm text-green-400">{message}</p>
      )}

      <form action={requestPasswordReset} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-md border border-neutral-700 px-3 py-2 text-base"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-full bg-brand px-4 py-2.5 font-semibold text-black hover:bg-brand-hover"
        >
          Send reset link
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-400">
        <Link href="/login" className="font-medium text-white underline">
          Back to log in
        </Link>
      </p>
    </main>
  );
}
