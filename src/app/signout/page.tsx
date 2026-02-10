import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import SignOutActions from "@/components/signout-actions";

export default async function SignOutPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const backHref = email ? "/gallery" : "/";
  const backLabel = email ? "Back to gallery" : "Back to home";

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10 text-sm">
      <header className="space-y-2">
        <Link href={backHref} className="text-xs text-neutral-500 underline">
          {backLabel}
        </Link>
        <h1 className="text-2xl font-semibold">Sign out</h1>
        <p className="text-neutral-600">
          {email
            ? `You're signed in as ${email}.`
            : "You're already signed out. Head back home when you're ready."}
        </p>
      </header>

      <section className="space-y-4 rounded-md border border-neutral-200 p-4">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Confirm sign out</h2>
          <p className="text-neutral-600">
            Signing out will end your session on this device.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {email ? <SignOutActions callbackUrl="/" /> : null}
          <Link href="/" className="text-xs text-neutral-500 underline">
            Return to home
          </Link>
        </div>
      </section>
    </main>
  );
}

