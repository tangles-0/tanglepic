import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAdminStats, isAdminUser } from "@/lib/metadata-store";

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0;
  let size = value;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(1)} ${units[index]}`;
}

export default async function AdminHomePage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect("/");
  }

  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) {
    redirect("/gallery");
  }

  const stats = await getAdminStats();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10 text-sm">
      <header className="space-y-2">
        <Link href="/gallery" className="text-sm text-neutral-500 underline">
          Back to gallery
        </Link>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-neutral-600">Platform overview and controls.</p>
      </header>

      <div className="flex flex-wrap gap-3 text-sm text-neutral-500">
        <Link href="/admin/users" className="underline">
          Users
        </Link>
        <Link href="/admin/groups" className="underline">
          Groups
        </Link>
        <Link href="/admin/limits" className="underline">
          Limits
        </Link>
        <Link href="/admin/settings" className="underline">
          Settings
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-neutral-200 p-4">
          <div className="text-xs text-neutral-500">Total disk usage</div>
          <div className="mt-2 text-lg font-semibold">{formatBytes(stats.totalBytes)}</div>
        </div>
        <div className="rounded border border-neutral-200 p-4">
          <div className="text-xs text-neutral-500">Files</div>
          <div className="mt-2 text-lg font-semibold">{stats.imageCount}</div>
        </div>
        <div className="rounded border border-neutral-200 p-4">
          <div className="text-xs text-neutral-500">Users</div>
          <div className="mt-2 text-lg font-semibold">{stats.userCount}</div>
        </div>
        <div className="rounded border border-neutral-200 p-4">
          <div className="text-xs text-neutral-500">Uploads last 24h</div>
          <div className="mt-2 text-lg font-semibold">{stats.uploadsLast24h}</div>
        </div>
        <div className="rounded border border-neutral-200 p-4">
          <div className="text-xs text-neutral-500">Signups last 24h</div>
          <div className="mt-2 text-lg font-semibold">{stats.signupsLast24h}</div>
        </div>
        <div className="rounded border border-neutral-200 p-4">
          <div className="text-xs text-neutral-500">Signups last 30d</div>
          <div className="mt-2 text-lg font-semibold">{stats.signupsLast30d}</div>
        </div>
        <div className="rounded border border-neutral-200 p-4">
          <div className="text-xs text-neutral-500">Albums</div>
          <div className="mt-2 text-lg font-semibold">{stats.albumCount}</div>
        </div>
        <div className="rounded border border-neutral-200 p-4">
          <div className="text-xs text-neutral-500">Shared images</div>
          <div className="mt-2 text-lg font-semibold">{stats.sharedPercent}%</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-neutral-200 p-4 text-xs">
          <div className="text-neutral-500">Average file size</div>
          <div className="mt-2 text-lg font-semibold">
            {formatBytes(stats.averageFileSize)}
          </div>
        </div>
        <div className="rounded border border-neutral-200 p-4">
          <div className="text-xs text-neutral-500">File types</div>
          <div className="mt-3 space-y-2 text-xs">
            {stats.filetypeBreakdown.length === 0 ? (
              <div className="text-neutral-500">No uploads yet.</div>
            ) : (
              stats.filetypeBreakdown.map((item) => (
                <div key={item.ext} className="flex items-center justify-between">
                  <span>.{item.ext}</span>
                  <span>{item.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

