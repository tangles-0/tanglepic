"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/components/theme/theme-provider";
import { ThemeIcon, THEMES } from "@/components/theme/themes";

function formatThemeLabel(option: string): string {
  if (option === "crt") return "CRT";
  return option.replace("-", " ");
}

export default function FloatingThemeSelector() {
  const { theme, setTheme, isSaving } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="floating-theme-selector fixed top-4 right-4 z-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="floating-theme-button flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition hover:shadow-xl"
        aria-label="Select theme"
        aria-expanded={isOpen}
      >
        <ThemeIcon theme={theme} />
      </button>

      {isOpen ? (
        <div className="floating-theme-dropdown absolute right-0 mt-2 w-48 rounded-md border shadow-xl">
          <div className="py-1">
            {THEMES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  void setTheme(option);
                  setIsOpen(false);
                }}
                disabled={isSaving}
                className={`floating-theme-option flex w-full items-center gap-3 px-4 py-2 text-left text-xs transition ${theme === option ? "font-medium" : ""
                  } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <ThemeIcon theme={option} />
                <span className="capitalize">{formatThemeLabel(option)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

