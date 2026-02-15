"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { THEMES } from "@/components/theme/themes";

function formatThemeLabel(option: string): string {
  if (option === "crt") return "CRT";
  return option;
}

export default function ThemeSelector() {
  const { theme, setTheme, isSaving } = useTheme();

  return (
    <label className="flex items-center gap-2 text-xs text-neutral-500">
      <span>Theme</span>
      <select
        value={theme}
        onChange={(event) => void setTheme(event.target.value)}
        className="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-700"
        disabled={isSaving}
      >
        {THEMES.map((option) => (
          <option key={option} value={option}>
            {formatThemeLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

