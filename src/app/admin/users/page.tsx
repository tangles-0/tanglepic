import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdminUser, listUsersWithStats } from "@/lib/metadata-store";
import ManageUsersTable from "@/components/manage-users-table";

export default async function ManageUsersPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect("/");
  }

  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) {
    redirect("/gallery");
  }

  const users = await listUsersWithStats();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10 text-sm">
      <header className="space-y-2">
        <Link href="/admin" className="text-xs text-neutral-500 underline">
          Back to admin
        </Link>
        <h1 className="text-2xl font-semibold">Manage users</h1>
        <p className="text-neutral-600">Admin-only access.</p>
      </header>

      <ManageUsersTable users={users} />
    </main>
  );
}

