"use client";

import { useEffect, useMemo, useState } from "react";

type AlbumImage = {
  id: string;
  baseName: string;
  ext: string;
  width: number;
  height: number;
  uploadedAt: string;
  shared?: boolean;
};

type ShareInfo = {
  id: string;
  urls: {
    original: string;
    sm: string;
    lg: string;
  };
};

export default function AlbumView({
  albumId,
  images,
}: {
  albumId: string;
  images: AlbumImage[];
}) {
  const [items, setItems] = useState<AlbumImage[]>(images);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkError, setBulkError] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const sortedImages = useMemo(
    () => items.slice().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    [items],
  );

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied((current) => (current === label ? null : current)), 1200);
  }

  async function enableShares() {
    setError(null);
    const response = await fetch("/api/album-shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Unable to enable album share.");
      return;
    }

    const payload = (await response.json()) as { url: string };
    setShareUrl(payload.url);
    setShareEnabled(true);
  }

  async function disableShares() {
    setError(null);
    await fetch("/api/album-shares", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId }),
    });
    setShareUrl(null);
    setShareEnabled(false);
  }

  useEffect(() => {
    let isMounted = true;
    async function loadShare() {
      const response = await fetch(`/api/album-shares?albumId=${albumId}`);
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { share: { id: string }; url?: string } | { share: null };
      if (!isMounted) {
        return;
      }
      if ("share" in payload && payload.share && payload.url) {
        setShareEnabled(true);
        setShareUrl(payload.url);
      }
    }

    void loadShare();
    return () => {
      isMounted = false;
    };
  }, [albumId]);

  async function runBulkAction(action: string) {
    setBulkError(null);
    const response = await fetch("/api/images/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, imageIds: selectedIds }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setBulkError(payload.error ?? "Bulk action failed.");
      return false;
    }

    return true;
  }

  async function handleRemoveFromAlbum() {
    const ok = await runBulkAction("removeFromAlbum");
    if (!ok) return;
    setItems((current) => current.filter((image) => !selected.has(image.id)));
    setSelected(new Set());
  }

  async function handleDisableSharing() {
    const ok = await runBulkAction("disableSharing");
    if (!ok) return;
    setSelected(new Set());
  }

  async function handleDelete() {
    const ok = await runBulkAction("delete");
    if (!ok) return;
    setItems((current) => current.filter((image) => !selected.has(image.id)));
    setSelected(new Set());
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-neutral-200 px-4 py-3 text-xs">
        <span className="text-neutral-600">
          Album sharing: {shareEnabled ? "enabled" : "disabled"}
        </span>
        {shareEnabled ? (
          <span className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white">
            Album shared
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void (shareEnabled ? disableShares() : enableShares());
          }}
          className={`rounded px-3 py-1 text-xs ${
            shareEnabled ? "bg-black text-white" : "border border-neutral-200"
          }`}
        >
          {shareEnabled ? "Disable" : "Enable"}
        </button>
      </div>

      {shareEnabled && shareUrl ? (
        <div className="rounded border border-neutral-200 px-4 py-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-neutral-600">Album share link</span>
            <button
              type="button"
              onClick={() => copyText(`${origin}${shareUrl}`, "album-share")}
              className="rounded border border-neutral-200 px-3 py-1 text-xs"
            >
              Copy link
            </button>
          </div>
          <div className="mt-2 break-all text-xs">
            {origin}
            {shareUrl}
          </div>
          {copied === "album-share" ? (
            <span className="text-[11px] text-emerald-600">Copied</span>
          ) : null}
        </div>
      ) : null}

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded border border-neutral-200 px-4 py-2 text-xs">
          <span>{selectedIds.length} selected</span>
          <button
            type="button"
            onClick={handleRemoveFromAlbum}
            className="rounded border border-neutral-200 px-3 py-1"
          >
            Remove from album
          </button>
          <button
            type="button"
            onClick={handleDisableSharing}
            className="rounded border border-neutral-200 px-3 py-1"
          >
            Disable sharing
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded border border-red-200 px-3 py-1 text-red-600"
          >
            Delete
          </button>
          {bulkError ? <span className="text-red-600">{bulkError}</span> : null}
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <div className="space-y-6">
        {sortedImages.map((image) => {
          return (
            <div key={image.id} className="rounded-md border border-neutral-200 p-4">
              {image.shared ? (
                <span className="mb-2 inline-flex rounded bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white">
                  Shared
                </span>
              ) : null}
              <label className="flex items-center gap-2 text-xs text-neutral-500">
                <input
                  type="checkbox"
                  checked={selected.has(image.id)}
                  onChange={(event) => {
                    const next = new Set(selected);
                    if (event.target.checked) {
                      next.add(image.id);
                    } else {
                      next.delete(image.id);
                    }
                    setSelected(next);
                  }}
                />
                Select
              </label>
              <img
                src={`/image/${image.id}/${image.baseName}-lg.${image.ext}`}
                alt="Album image"
                className="w-full rounded border border-neutral-200 object-contain"
              />
              <div className="mt-3 text-xs text-neutral-500">
                {image.width}×{image.height} •{" "}
                {new Date(image.uploadedAt).toLocaleString()}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

