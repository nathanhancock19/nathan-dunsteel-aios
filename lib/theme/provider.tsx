"use client"

/**
 * Theme provider for AIOS.
 *
 * Reads the resolved theme from <html data-theme="..."> (set by an inline
 * script in app/layout.tsx before paint), keeps it in React state, and
 * persists changes to localStorage.
 *
 * No-flash strategy: the inline <script> in <head> reads localStorage and
 * the system preference, sets data-theme, and the provider just hydrates
 * that value into state.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { ToastProvider } from "@/components/ui/Toast"

export type Theme = "dark" | "light"

type ThemeContextValue = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = "aios-theme"

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark"
  const fromAttr = document.documentElement.getAttribute("data-theme")
  return fromAttr === "light" ? "light" : "dark"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")

  // Hydrate from the data-theme attribute set by the inline script
  useEffect(() => {
    setThemeState(readInitialTheme())
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", t)
    }
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {
      // localStorage may be disabled; ignore
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <ToastProvider>{children}</ToastProvider>
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}

/**
 * The pre-paint script that resolves the theme. Embed in <head> via
 * dangerouslySetInnerHTML to run before React hydrates.
 */
export const THEME_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('aios-theme');
    var theme;
    if (stored === 'dark' || stored === 'light') {
      theme = stored;
    } else {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`.trim()
