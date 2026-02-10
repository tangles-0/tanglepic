import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdminUser, listGroupsWithCounts, listUsersWithStats } from "@/lib/metadata-store";
import ManageGroupsClient from "@/components/manage-groups-client";

export default async function AdminGroupsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect("/");
  }

  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) {
    redirect("/gallery");
  }

  const [groups, users] = await Promise.all([
    listGroupsWithCounts(),
    listUsersWithStats(),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10 text-sm">
      <header className="space-y-2">
        <Link href="/admin" className="text-xs text-neutral-500 underline">
          Back to admin
        </Link>
        <h1 className="text-2xl font-semibold">Groups</h1>
        <p className="text-neutral-600">Create groups and manage membership.</p>
      </header>

      <ManageGroupsClient currentUserId={userId} groups={groups} users={users} />
    </main>
  );
}

