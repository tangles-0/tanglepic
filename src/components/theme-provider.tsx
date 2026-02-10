"use client";

import { createContext, useContext, useMemo, useState } from "react";

type ThemeContextValue = {
  theme: string;
  isSaving: boolean;
  setTheme: (next: string) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: string;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState(initialTheme);
  const [isSaving, setIsSaving] = useState(false);

  async function setTheme(next: string) {
    if (next === theme) return;
    const previous = theme;
    setThemeState(next);
    setIsSaving(true);
    try {
      const response = await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
      });
      if (!response.ok) {
        setThemeState(previous);
      }
    } finally {
      setIsSaving(false);
    }
  }

  const value = useMemo(
    () => ({
      theme,
      isSaving,
      setTheme,
    }),
    [theme, isSaving],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: "default",
      isSaving: false,
      setTheme: async () => undefined,
    };
  }
  return context;
}

