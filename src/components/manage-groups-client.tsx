"use client";

import { useMemo, useState } from "react";

type GroupSummary = {
  id: string;
  name: string;
  userCount: number;
};

type UserRow = {
  id: string;
  email: string;
  groupId?: string;
  groupName?: string;
};

export default function ManageGroupsClient({
  currentUserId,
  groups,
  users,
}: {
  currentUserId: string;
  groups: GroupSummary[];
  users: UserRow[];
}) {
  const [groupItems, setGroupItems] = useState(groups);
  const [userItems, setUserItems] = useState(users);
  const [newGroupName, setNewGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const groupOptions = useMemo(
    () => [{ id: "", name: "Ungrouped" }, ...groupItems],
    [groupItems],
  );

  async function createGroup() {
    const name = newGroupName.trim();
    if (!name) {
      setError("Group name is required.");
      return;
    }
    setError(null);
    const response = await fetch("/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Unable to create group.");
      return;
    }

    const payload = (await response.json()) as { group: GroupSummary };
    setGroupItems((current) => [...current, payload.group].sort((a, b) => a.name.localeCompare(b.name)));
    setNewGroupName("");
  }

  async function deleteGroup(groupId: string) {
    setError(null);
    setBusy(groupId);
    const response = await fetch(`/api/admin/groups/${groupId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Unable to delete group.");
      setBusy(null);
      return;
    }

    setGroupItems((current) => current.filter((group) => group.id !== groupId));
    setUserItems((current) =>
      current.map((user) =>
        user.groupId === groupId ? { ...user, groupId: undefined, groupName: undefined } : user,
      ),
    );
    setBusy(null);
  }

  async function updateUserGroup(userId: string, groupId: string) {
    setError(null);
    setBusy(userId);
    const response = await fetch(`/api/admin/users/${userId}/group`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: groupId || null }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Unable to update user group.");
      setBusy(null);
      return;
    }

    const groupName = groupItems.find((group) => group.id === groupId)?.name;
    setUserItems((current) =>
      current.map((user) =>
        user.id === userId ? { ...user, groupId: groupId || undefined, groupName } : user,
      ),
    );
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <section className="rounded border border-neutral-200 p-4">
        <h2 className="text-sm font-medium">Create group</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            className="rounded border px-3 py-2 text-xs"
            placeholder="Group name"
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
          />
          <button
            type="button"
            onClick={() => void createGroup()}
            className="rounded bg-black px-3 py-2 text-xs text-white"
          >
            Add group
          </button>
        </div>
      </section>

      <section className="rounded border border-neutral-200 p-4">
        <h2 className="text-sm font-medium">Groups</h2>
        <div className="mt-3 space-y-2">
          {groupItems.map((group) => (
            <div
              key={group.id}
              className="flex items-center justify-between gap-3 rounded border border-neutral-100 px-3 py-2 text-xs"
            >
              <div>
                <div className="font-medium">{group.name}</div>
                <div className="text-neutral-500">{group.userCount} users</div>
              </div>
              <button
                type="button"
                onClick={() => void deleteGroup(group.id)}
                className="rounded border border-red-200 px-2 py-1 text-red-600"
                disabled={group.name === "admin" || busy === group.id}
                title={group.name === "admin" ? "Admin group cannot be deleted" : "Delete group"}
              >
                Delete
              </button>
            </div>
          ))}
          {groupItems.length === 0 ? (
            <p className="text-xs text-neutral-500">No groups created yet.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded border border-neutral-200 p-4">
        <h2 className="text-sm font-medium">Assign users</h2>
        <div className="mt-3 overflow-auto">
          <table className="min-w-[640px] w-full text-xs">
            <thead className="text-left text-[11px] uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Group</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {userItems.map((user) => {
                const currentGroup = user.groupId ?? "";
                return (
                  <tr key={user.id} className="border-t border-neutral-200">
                    <td className="px-3 py-2">{user.email}</td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded border px-2 py-1"
                        value={currentGroup}
                        onChange={(event) =>
                          void updateUserGroup(user.id, event.target.value)
                        }
                        disabled={
                          busy === user.id ||
                          (user.id === currentUserId && user.groupName === "admin")
                        }
                      >
                        {groupOptions.map((group) => (
                          <option key={group.id || "none"} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      {user.id === currentUserId && user.groupName === "admin" ? (
                        <span className="text-neutral-500">You</span>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

