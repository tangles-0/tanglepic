import type { ReactNode } from "react";

type AlertTone = "warning" | "info" | "success" | "danger";

const TONE_STYLES: Record<AlertTone, string> = {
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  danger: "border-red-200 bg-red-50 text-red-700",
};

export default function AlertBanner({
  tone = "warning",
  children,
}: {
  tone?: AlertTone;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-md border p-3 text-xs ${TONE_STYLES[tone]}`}>{children}</div>
  );
}

