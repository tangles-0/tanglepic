import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getGroupLimits, isAdminUser, listGroupsWithCounts } from "@/lib/metadata-store";
import ManageLimitsClient from "@/components/manage-limits-client";

export default async function AdminLimitsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect("/");
  }

  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) {
    redirect("/gallery");
  }

  const groups = await listGroupsWithCounts();
  const ungroupedLimits = await getGroupLimits(null);
  const groupLimits = await Promise.all(
    groups.map(async (group) => ({
      groupId: group.id,
      groupName: group.name,
      limits: await getGroupLimits(group.id),
    })),
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10 text-sm">
      <header className="space-y-2">
        <Link href="/admin" className="text-sm text-neutral-500 underline">
          Back to admin
        </Link>
        <h1 className="text-2xl font-semibold">Group limits</h1>
        <p className="text-neutral-600">
          Configure upload constraints by group. Rate limits do not block admins.
        </p>
      </header>

      <ManageLimitsClient ungroupedLimits={ungroupedLimits} groupLimits={groupLimits} />
    </main>
  );
}

