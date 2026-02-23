"use client";

import { LightClock } from "@energiz3r/icon-library/Icons/Light/LightClock";
import { LightFilePdf } from "@energiz3r/icon-library/Icons/Light/LightFilePdf";

export function FileViewerContent({
  kind,
  previewStatus,
  fullUrl,
  previewUrl,
}: {
  kind: "video" | "document" | "other";
  previewStatus?: "pending" | "ready" | "failed";
  fullUrl: string;
  previewUrl: string;
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
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <LightClock className="h-4 w-4" fill="currentColor" />
            <span>preview pending</span>
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
      <LightFilePdf className="h-12 w-12 text-neutral-500" fill="currentColor" />
    </div>
  );
}

