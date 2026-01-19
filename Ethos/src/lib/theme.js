// src/lib/theme.js

const DEFAULTS = {
    themeMode: "system", // "system" | "light" | "dark"
    accent1: "#7c3aed",  // purple
    accent2: "#14b8a6",  // teal
  };
  
  export function normalizePrefs(prefs) {
    const p = prefs || {};
    return {
      themeMode: p.themeMode || DEFAULTS.themeMode,
      accent1: p.accent1 || DEFAULTS.accent1,
      accent2: p.accent2 || DEFAULTS.accent2,
    };
  }
  
  export function applyThemeFromProfile(profile) {
    const prefs = normalizePrefs(profile?.preferences);
  
    // Hook for CSS theme selection
    document.documentElement.dataset.theme = prefs.themeMode;
  
    // Accent colors as CSS variables
    document.documentElement.style.setProperty("--accent-1", prefs.accent1);
    document.documentElement.style.setProperty("--accent-2", prefs.accent2);
  }
  