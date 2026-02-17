import type { ReactNode } from "react";

type AlertTone = "warning" | "info" | "success" | "danger";

const TONE_STYLES: Record<AlertTone, string> = {
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "",
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
  const infoStyle =
    tone === "info"
      ? {
          borderColor: "var(--theme-alert-info-border, var(--theme-alert-success-border))",
          backgroundColor: "var(--theme-alert-info-bg, var(--theme-alert-success-bg))",
          color: "var(--theme-alert-info, var(--theme-alert-success))",
        }
      : undefined;
  return (
    <div className={`rounded-md border p-3 text-xs ${TONE_STYLES[tone]}`} style={infoStyle}>
      {children}
    </div>
  );
}

