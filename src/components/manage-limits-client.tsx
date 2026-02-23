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

type MimeCategory = {
  id: "image" | "video" | "document" | "file";
  label: string;
  types: string[];
};

const MIME_CATEGORIES: MimeCategory[] = [
  {
    id: "image",
    label: "Image",
    types: [
      "image/*",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/bmp",
      "image/tiff",
      "image/svg+xml",
    ],
  },
  {
    id: "video",
    label: "Video",
    types: [
      "video/*",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
      "video/mpeg",
    ],
  },
  {
    id: "document",
    label: "Document",
    types: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
      "application/rtf",
      "application/vnd.oasis.opendocument.text",
      "application/vnd.oasis.opendocument.spreadsheet",
      "application/vnd.oasis.opendocument.presentation",
      "text/markdown",
      "application/json",
    ],
  },
  {
    id: "file",
    label: "File / Archive / Audio",
    types: [
      "audio/*",
      "audio/mpeg",
      "audio/wav",
      "audio/midi",
      "audio/ogg",
      "audio/flac",
      "application/zip",
      "application/x-7z-compressed",
      "application/gzip",
      "application/x-tar",
      "application/vnd.rar",
      "application/octet-stream",
    ],
  },
];

const KNOWN_TYPES = new Set(MIME_CATEGORIES.flatMap((category) => category.types));

function normalizeTypes(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function MimeTypePicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const selected = new Set(normalizeTypes(value));
  const custom = Array.from(selected).filter((entry) => !KNOWN_TYPES.has(entry)).sort();

  function toggleType(type: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) {
      next.add(type);
    } else {
      next.delete(type);
    }
    onChange(Array.from(next).sort());
  }

  function removeCustom(type: string) {
    const next = new Set(selected);
    next.delete(type);
    onChange(Array.from(next).sort());
  }

  return (
    <div className="space-y-2 rounded border border-neutral-200 p-2">
      <p className="text-[11px] text-neutral-500">
        Select allowed MIME types. If none are selected, uploads are unrestricted.
      </p>
      <div className="space-y-2">
        {MIME_CATEGORIES.map((category) => (
          <details key={category.id} className="rounded border border-neutral-100 p-2" open>
            <summary className="cursor-pointer text-xs font-medium">{category.label}</summary>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {category.types.map((type) => {
                const isChecked = selected.has(type);
                return (
                  <label key={type} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(event) => toggleType(type, event.target.checked)}
                    />
                    <span className="break-all">{type}</span>
                  </label>
                );
              })}
            </div>
          </details>
        ))}
      </div>
      {custom.length > 0 ? (
        <div className="space-y-1 rounded border border-dashed border-neutral-300 p-2">
          <p className="text-[11px] font-medium text-neutral-600">Custom types already set</p>
          <div className="flex flex-wrap gap-2">
            {custom.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => removeCustom(type)}
                className="rounded border border-neutral-200 px-2 py-1 text-[11px]"
                title="Remove custom type"
              >
                {type} x
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

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

  function updateNumericRow(
    groupId: string | null,
    field: "maxFileSize" | "rateLimitPerMinute",
    value: string,
  ) {
    if (groupId === null) {
      setDefaultRow((current) => ({
        ...current,
        [field]: Number(value),
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
                [field]: Number(value),
              },
            }
          : row,
      ),
    );
  }

  function updateAllowedTypes(groupId: string | null, nextTypes: string[]) {
    const normalized = normalizeTypes(nextTypes);
    if (groupId === null) {
      setDefaultRow((current) => ({
        ...current,
        allowedTypes: normalized,
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
                allowedTypes: normalized,
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
                updateNumericRow(null, "maxFileSize", String(Number(event.target.value) * 1024 * 1024))
              }
            />
          </label>
          <div className="flex flex-col gap-1 text-xs md:col-span-2">
            Allowed types
            <MimeTypePicker
              value={defaultRow.allowedTypes}
              onChange={(next) => updateAllowedTypes(null, next)}
            />
          </div>
          <label className="flex flex-col gap-1 text-xs">
            Rate limit / min
            <input
              className="rounded border px-2 py-1"
              type="number"
              value={defaultRow.rateLimitPerMinute}
              onChange={(event) => updateNumericRow(null, "rateLimitPerMinute", event.target.value)}
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
                      updateNumericRow(
                        row.groupId,
                        "maxFileSize",
                        String(Number(event.target.value) * 1024 * 1024),
                      )
                    }
                  />
                </label>
                <div className="flex flex-col gap-1 text-xs md:col-span-2">
                  Allowed types
                  <MimeTypePicker
                    value={row.limits.allowedTypes}
                    onChange={(next) => updateAllowedTypes(row.groupId, next)}
                  />
                </div>
                <label className="flex flex-col gap-1 text-xs">
                  Rate limit / min
                  <input
                    className="rounded border px-2 py-1"
                    type="number"
                    value={row.limits.rateLimitPerMinute}
                    onChange={(event) =>
                      updateNumericRow(row.groupId, "rateLimitPerMinute", event.target.value)
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

