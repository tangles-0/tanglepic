import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import UploadDropzone from "@/components/upload-dropzone";

export default async function UploadPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10 text-sm">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Upload images</h1>
        <p className="text-neutral-600">
          Logged in as {session.user.email ?? "user"}.
        </p>
      </header>

      <UploadDropzone />

      <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
        <Link href="/gallery" className="underline">
          Back to gallery
        </Link>
        <Link href="/api/auth/signout" className="underline">
          Sign out
        </Link>
      </div>
    </main>
  );
}

