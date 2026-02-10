"use client";

import { useState } from "react";

type GroupLimits = {
  id: string;
  groupId: string | null;
  maxFileSize: number;
  allowedTypes: string[];
  rateLimitPerMinute: number;
  createdAt: string;
  updatedAt: string;
};

type GroupLimitRow = {
  groupId: string;
  groupName: string;
  limits: GroupLimits;
};

export default function ManageLimitsClient({
  ungroupedLimits,
  groupLimits,
}: {
  ungroupedLimits: GroupLimits;
  groupLimits: GroupLimitRow[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rows, setRows] = useState<GroupLimitRow[]>(
    groupLimits.map((item) => ({ ...item })),
  );
  const [defaultRow, setDefaultRow] = useState<GroupLimits>({ ...ungroupedLimits });

  function updateRow(groupId: string | null, field: keyof GroupLimits, value: string) {
    if (groupId === null) {
      setDefaultRow((current) => ({
        ...current,
        [field]:
          field === "allowedTypes"
            ? value.split(",").map((item) => item.trim()).filter(Boolean)
            : Number(value),
      }));
      return;
    }

    setRows((current) =>
      current.map((row) =>
        row.groupId === groupId
          ? {
              ...row,
              limits: {
                ...row.limits,
                [field]:
                  field === "allowedTypes"
                    ? value.split(",").map((item) => item.trim()).filter(Boolean)
                    : Number(value),
              },
            }
          : row,
      ),
    );
  }

  async function saveRow(groupId: string | null) {
    setError(null);
    setBusyId(groupId ?? "default");
    const payload =
      groupId === null
        ? { groupId: null, limits: defaultRow }
        : {
            groupId,
            limits: rows.find((row) => row.groupId === groupId)?.limits,
          };

    const response = await fetch("/api/admin/limits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorPayload = (await response.json()) as { error?: string };
      setError(errorPayload.error ?? "Unable to update limits.");
      setBusyId(null);
      return;
    }

    const result = (await response.json()) as { limits: GroupLimits };
    if (groupId === null) {
      setDefaultRow(result.limits);
    } else {
      setRows((current) =>
        current.map((row) =>
          row.groupId === groupId ? { ...row, limits: result.limits } : row,
        ),
      );
    }
    setBusyId(null);
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <section className="rounded border border-neutral-200 p-4">
        <h2 className="text-sm font-medium">Ungrouped users (default)</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs">
            Max file size (MB)
            <input
              className="rounded border px-2 py-1"
              type="number"
              value={Math.round(defaultRow.maxFileSize / (1024 * 1024))}
              onChange={(event) =>
                updateRow(null, "maxFileSize", String(Number(event.target.value) * 1024 * 1024))
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs md:col-span-2">
            Allowed types (comma separated)
            <input
              className="rounded border px-2 py-1"
              value={defaultRow.allowedTypes.join(",")}
              onChange={(event) => updateRow(null, "allowedTypes", event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Rate limit / min
            <input
              className="rounded border px-2 py-1"
              type="number"
              value={defaultRow.rateLimitPerMinute}
              onChange={(event) => updateRow(null, "rateLimitPerMinute", event.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void saveRow(null)}
          className="mt-3 rounded bg-black px-3 py-1 text-xs text-white"
          disabled={busyId === "default"}
        >
          Save default limits
        </button>
      </section>

      <section className="rounded border border-neutral-200 p-4">
        <h2 className="text-sm font-medium">Groups</h2>
        <div className="mt-4 space-y-4">
          {rows.map((row) => (
            <div key={row.groupId} className="rounded border border-neutral-100 p-3">
              <div className="text-xs font-medium">{row.groupName}</div>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <label className="flex flex-col gap-1 text-xs">
                  Max file size (MB)
                  <input
                    className="rounded border px-2 py-1"
                    type="number"
                    value={Math.round(row.limits.maxFileSize / (1024 * 1024))}
                    onChange={(event) =>
                      updateRow(
                        row.groupId,
                        "maxFileSize",
                        String(Number(event.target.value) * 1024 * 1024),
                      )
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs md:col-span-2">
                  Allowed types (comma separated)
                  <input
                    className="rounded border px-2 py-1"
                    value={row.limits.allowedTypes.join(",")}
                    onChange={(event) =>
                      updateRow(row.groupId, "allowedTypes", event.target.value)
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  Rate limit / min
                  <input
                    className="rounded border px-2 py-1"
                    type="number"
                    value={row.limits.rateLimitPerMinute}
                    onChange={(event) =>
                      updateRow(row.groupId, "rateLimitPerMinute", event.target.value)
                    }
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => void saveRow(row.groupId)}
                className="mt-3 rounded border border-neutral-200 px-3 py-1 text-xs"
                disabled={busyId === row.groupId}
              >
                Save limits
              </button>
            </div>
          ))}
          {rows.length === 0 ? (
            <p className="text-xs text-neutral-500">No groups to configure yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

