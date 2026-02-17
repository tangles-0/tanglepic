"use client";

import Link from "next/link";
import { useState } from "react";
import AlertBanner from "@/components/ui/alert-banner";

function formatBannerTimestamp(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const meridiem = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;
  return `${year}/${month}/${day} ${hour12}:${minutes}${meridiem}`;
}

function truncateDescription(value: string, max = 110): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1)}...`;
}

export default function PatchNoteBanner({
  publishedAt,
  firstLine,
}: {
  publishedAt: string;
  firstLine: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  async function dismiss() {
    setIsDismissing(true);
    try {
      const response = await fetch("/api/patch-notes?action=dismiss-latest", { method: "POST" });
      if (response.ok) {
        setDismissed(true);
      }
    } finally {
      setIsDismissing(false);
    }
  }

  if (dismissed) {
    return null;
  }

  return (
    <AlertBanner tone="info">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0">
          <span className="font-medium">new update {formatBannerTimestamp(publishedAt)}:</span>{" "}
          <Link href="/patch-notes" className="underline">
            {truncateDescription(firstLine) || "view patch notes"}
          </Link>
        </p>
        <button
          type="button"
          onClick={() => void dismiss()}
          disabled={isDismissing}
          className="shrink-0 rounded border px-2 py-1 text-[11px] disabled:opacity-70"
          style={{
            borderColor: "var(--theme-alert-info-border, var(--theme-alert-success-border))",
            color: "var(--theme-alert-info, var(--theme-alert-success))",
            backgroundColor: "color-mix(in srgb, var(--theme-panel) 90%, transparent)",
          }}
        >
          Dismiss
        </button>
      </div>
    </AlertBanner>
  );
}

