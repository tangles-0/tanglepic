import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAppSettings } from "@/lib/metadata-store";
import UploadDropzone from "@/components/upload-dropzone";

export default async function UploadPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/");
  }

  const settings = await getAppSettings();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10 text-sm">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Upload images</h1>
        <p className="text-neutral-600">
          Logged in as {session.user.email ?? "user"}.
        </p>
      </header>

      {!settings.uploadsEnabled ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Uploads are currently disabled by the administrator.
        </div>
      ) : null}

      <UploadDropzone uploadsEnabled={settings.uploadsEnabled} />

      <div className="flex flex-wrap gap-4 text-sm text-neutral-500">
        <Link href="/gallery" className="underline">
          Back to gallery
        </Link>
        <Link href="/signout" className="underline">
          Sign out
        </Link>
      </div>
    </main>
  );
}

