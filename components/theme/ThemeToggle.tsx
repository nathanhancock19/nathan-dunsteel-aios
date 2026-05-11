"use client"

import { useTheme } from "@/lib/theme/provider"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const Icon = theme === "dark" ? Sun : Moon
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg ${className ?? ""}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
