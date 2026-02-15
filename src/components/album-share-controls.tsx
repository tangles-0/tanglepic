"use client";

import { useEffect, useState } from "react";

export default function AlbumShareControls({ albumId }: { albumId: string }) {
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

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

  async function copyLink() {
    if (!shareUrl) {
      return;
    }
    await navigator.clipboard.writeText(`${origin}${shareUrl}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-neutral-200 px-4 py-3 text-xs">
        <span className="text-neutral-600">Album sharing: {shareEnabled ? "enabled" : "disabled"}</span>
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
              onClick={() => void copyLink()}
              className="rounded border border-neutral-200 px-3 py-1 text-xs"
            >
              Copy link
            </button>
          </div>
          <div className="mt-2 break-all text-xs">
            {origin}
            {shareUrl}
          </div>
          {copied ? <span className="text-[11px] text-emerald-600">Copied</span> : null}
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}


