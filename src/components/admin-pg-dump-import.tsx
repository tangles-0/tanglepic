"use client";

import { useState } from "react";

type ImportResponse = {
  message?: string;
  error?: string;
};

export default function AdminPgDumpImport() {
  const [file, setFile] = useState<File | null>(null);
  const [s3Key, setS3Key] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function runImport() {
    const trimmedKey = s3Key.trim();
    if (!file && !trimmedKey) {
      setError("Choose a .sql/.dump file or enter an S3 object key.");
      return;
    }

    setError(null);
    setMessage(null);
    setIsUploading(true);
    try {
      const response = file
        ? await (async () => {
            const formData = new FormData();
            formData.append("dump", file);
            if (trimmedKey) {
              formData.append("s3Key", trimmedKey);
            }
            return fetch("/api/admin/settings/pg-dump-import", {
              method: "POST",
              body: formData,
            });
          })()
        : await fetch("/api/admin/settings/pg-dump-import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ s3Key: trimmedKey }),
          });

      const payload = (await response.json()) as ImportResponse;
      if (!response.ok) {
        setError(payload.error ?? "Import failed.");
        return;
      }
      setMessage(payload.message ?? "Import completed.");
    } catch {
      setError("Import failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="space-y-3 rounded border border-neutral-200 p-4">
      <h2 className="text-sm font-medium">Import PostgreSQL dump</h2>
      <p className="text-xs text-neutral-600">
        Upload a `.sql` or `.dump` PostgreSQL dump file. The server runs `psql` or `pg_restore`
        against the current database.
      </p>
      <label className="flex flex-col gap-2 text-xs">
        S3 object key (optional)
        <input
          type="text"
          placeholder="migration-artifacts/latex-20260219T141457Z.dump"
          value={s3Key}
          onChange={(event) => setS3Key(event.target.value)}
          className="rounded border px-3 py-2 text-xs"
        />
      </label>
      <label className="flex flex-col gap-2 text-xs">
        Dump file (optional)
        <input
          type="file"
          accept=".sql,.dump,text/sql,application/sql,application/octet-stream"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="rounded border px-3 py-2 text-xs"
        />
      </label>
      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          disabled={isUploading}
          onClick={() => void runImport()}
          className="rounded bg-black px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? "Importing..." : "Import dump"}
        </button>
        {message ? <span className="text-emerald-600">{message}</span> : null}
        {error ? <span className="text-red-600">{error}</span> : null}
      </div>
    </section>
  );
}
