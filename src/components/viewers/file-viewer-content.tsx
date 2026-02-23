"use client";

import { LightClock } from "@energiz3r/icon-library/Icons/Light/LightClock";
import { LightFilePdf } from "@energiz3r/icon-library/Icons/Light/LightFilePdf";
import { LightFileArchive } from "@energiz3r/icon-library/Icons/Light/LightFileArchive";

const ARCHIVE_EXTENSIONS = new Set(["zip", "7z", "gz", "gzip", "tar", "rar", "bz2", "xz"]);

function isArchiveLike(ext?: string, mimeType?: string): boolean {
  const normalizedExt = (ext ?? "").toLowerCase();
  const normalizedMime = (mimeType ?? "").toLowerCase();
  if (ARCHIVE_EXTENSIONS.has(normalizedExt)) {
    return true;
  }
  return (
    normalizedMime.includes("zip") ||
    normalizedMime.includes("7z") ||
    normalizedMime.includes("gzip") ||
    normalizedMime.includes("x-tar") ||
    normalizedMime.includes("rar") ||
    normalizedMime.includes("bzip") ||
    normalizedMime.includes("xz")
  );
}

export function FileViewerContent({
  kind,
  previewStatus,
  fullUrl,
  previewUrl,
  ext,
  mimeType,
  onRegenerateThumbnail,
  isRegeneratingThumbnail,
}: {
  kind: "video" | "document" | "other";
  previewStatus?: "pending" | "ready" | "failed";
  fullUrl: string;
  previewUrl: string;
  ext?: string;
  mimeType?: string;
  onRegenerateThumbnail?: () => void;
  isRegeneratingThumbnail?: boolean;
}) {
  if (kind === "video") {
    return (
      <div className="space-y-2">
        <video
          src={fullUrl}
          controls
          className="sm:max-h-[60vh] w-full rounded border border-neutral-200 object-contain"
          poster={previewStatus === "ready" ? previewUrl : undefined}
        />
        {previewStatus !== "ready" ? (
          <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
            <div className="flex items-center gap-2">
              <LightClock className="h-4 w-4" fill="currentColor" />
              <span>{previewStatus === "failed" ? "preview failed" : "preview pending"}</span>
            </div>
            {onRegenerateThumbnail ? (
              <button
                type="button"
                onClick={onRegenerateThumbnail}
                disabled={Boolean(isRegeneratingThumbnail)}
                className="rounded border border-neutral-200 px-2 py-1 text-[11px] disabled:opacity-50"
              >
                {isRegeneratingThumbnail ? "Regenerating..." : "Regenerate thumbnail"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }
  if (kind === "document") {
    return (
      <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={previewUrl}
          alt="Document preview"
          className="sm:max-h-[60vh] w-full rounded border border-neutral-200 object-contain"
        />
      </a>
    );
  }
  return (
    <div className="flex sm:max-h-[60vh] min-h-[320px] w-full items-center justify-center rounded border border-neutral-200 bg-neutral-50">
      {isArchiveLike(ext, mimeType) ? (
        <LightFileArchive className="h-12 w-12 text-neutral-500" fill="currentColor" />
      ) : (
        <LightFilePdf className="h-12 w-12 text-neutral-500" fill="currentColor" />
      )}
    </div>
  );
}

