import { createContext, use, useEffect, useMemo, useState } from "react";

export type ThemeMode = "dark" | "light";

export function getOverriddenThemeMode(): ThemeMode | null {
  const lsTheme = localStorage.getItem("theme");
  if (lsTheme === "dark") {
    return "dark";
  }
  if (lsTheme === "light") {
    return "light";
  }
  return null;
}

function getMatchMedia() {
  return window.matchMedia("(prefers-color-scheme: dark)");
}

export function getThemeMode(): ThemeMode {
  const overridden = getOverriddenThemeMode();
  if (overridden !== null) {
    return overridden;
  }
  return getSystemThemeMode();
}

function getSystemThemeMode() {
  return getMatchMedia().matches ? "dark" : "light";
}

export function useSystemThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getSystemThemeMode);

  useEffect(() => {
    const mediaQuery = getMatchMedia();
    const listener = () => {
      setThemeMode(mediaQuery.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", listener);
    return () => {
      mediaQuery.removeEventListener("change", listener);
    };
  }, []);

  return themeMode;
}

export function saveThemeMode(mode: ThemeMode | null) {
  if (mode === null) {
    localStorage.removeItem("theme");
    return;
  }
  localStorage.setItem("theme", mode);
}

export const ThemeModeContext = createContext<{
  overriddenMode: ThemeMode | null;
  systemMode: ThemeMode;
  setMode: (mode: ThemeMode | null) => void;
}>({
  overriddenMode: null,
  systemMode: "light",
  setMode: () => {},
});

export function ThemeModeProvider({
  children,
  overriddenMode,
  systemMode,
  setMode,
}: {
  children: React.ReactNode;
  overriddenMode: ThemeMode | null;
  systemMode: ThemeMode;
  setMode: (mode: ThemeMode | null) => void;
}) {
  const value = useMemo(() => {
    return { overriddenMode, systemMode, setMode };
  }, [overriddenMode, setMode, systemMode]);

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const { overriddenMode, systemMode } = use(ThemeModeContext);
  return overriddenMode ?? systemMode;
}
