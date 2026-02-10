"use client";

import { useState } from "react";

type UserStats = {
  id: string;
  username: string;
  email: string;
  groupName?: string;
  imageCount: number;
  totalBytes: number;
  averageBytes: number;
  lastUploadAt?: string;
  lastLoginAt?: string;
};

export default function ManageUsersTable({ users }: { users: UserStats[] }) {
  const [items, setItems] = useState(users);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  async function requestDeleteFiles(userId: string) {
    setError(null);
    setBusyUserId(userId);
    const response = await fetch(`/api/admin/users/${userId}/files`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Unable to delete files.");
      setBusyUserId(null);
      return;
    }

    setItems((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              imageCount: 0,
              totalBytes: 0,
              averageBytes: 0,
              lastUploadAt: undefined,
            }
          : user,
      ),
    );
    setBusyUserId(null);
  }

  async function requestDeleteUser(userId: string) {
    setError(null);
    setBusyUserId(userId);
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Unable to delete user.");
      setBusyUserId(null);
      return;
    }

    setItems((current) => current.filter((user) => user.id !== userId));
    setBusyUserId(null);
  }

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

  const formatTimestamp = (value?: string) =>
    value ? `${new Date(value).toISOString().replace("T", " ").slice(0, 19)} UTC` : "—";

  return (
    <div className="space-y-3">
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="overflow-auto rounded-md border border-neutral-200">
        <table className="min-w-[920px] w-full border-collapse text-xs">
          <thead className="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Group</th>
              <th className="px-3 py-2">Files</th>
              <th className="px-3 py-2">Total Size</th>
              <th className="px-3 py-2">Avg Size</th>
              <th className="px-3 py-2">Last Upload</th>
              <th className="px-3 py-2">Last Login</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((user) => (
              <tr key={user.id} className="border-t border-neutral-200">
                <td className="px-3 py-2">{user.username}</td>
                <td className="px-3 py-2">{user.email}</td>
                <td className="px-3 py-2">{user.groupName ?? "—"}</td>
                <td className="px-3 py-2">{user.imageCount}</td>
                <td className="px-3 py-2">{formatBytes(user.totalBytes)}</td>
                <td className="px-3 py-2">{formatBytes(user.averageBytes)}</td>
                <td className="px-3 py-2">{formatTimestamp(user.lastUploadAt)}</td>
                <td className="px-3 py-2">{formatTimestamp(user.lastLoginAt)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void requestDeleteFiles(user.id)}
                      className="rounded border border-neutral-200 px-2 py-1"
                      disabled={busyUserId === user.id}
                    >
                      Delete files
                    </button>
                    <button
                      type="button"
                      onClick={() => void requestDeleteUser(user.id)}
                      className="rounded border border-red-200 px-2 py-1 text-red-600"
                      disabled={busyUserId === user.id}
                    >
                      Delete user
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

