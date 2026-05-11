"use client"

import { useTheme } from "@/lib/theme/provider"
import { Card } from "@/components/ui/Card"
import { Palette, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils/cn"

export default function ThemePage() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="space-y-5">
      <Card title="Theme" icon={Palette}>
        <p className="mb-4 text-sm text-fg-muted">
          Toggles the entire app between light and dark mode. Preference persists across sessions.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ThemeOption
            label="Dark"
            description="Steel-navy palette. Default."
            icon={Moon}
            active={theme === "dark"}
            onClick={() => setTheme("dark")}
            preview="dark"
          />
          <ThemeOption
            label="Light"
            description="High-contrast for daytime."
            icon={Sun}
            active={theme === "light"}
            onClick={() => setTheme("light")}
            preview="light"
          />
        </div>
      </Card>

      <Card title="Density">
        <p className="text-sm text-fg-muted">
          Compact density is a v2 toggle. Currently fixed at Comfortable across the app.
        </p>
        <div className="mt-3 inline-flex rounded-md border border-border bg-surface-2 p-1 text-xs">
          <button disabled className="rounded bg-surface px-3 py-1 text-fg shadow-card-sm">Comfortable</button>
          <button disabled className="px-3 py-1 text-fg-subtle">Compact</button>
        </div>
      </Card>
    </div>
  )
}

function ThemeOption({
  label,
  description,
  icon: Icon,
  active,
  onClick,
  preview,
}: {
  label: string
  description: string
  icon: typeof Sun
  active: boolean
  onClick: () => void
  preview: "dark" | "light"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-3 text-left transition-all",
        active
          ? "border-accent bg-accent/5 ring-1 ring-accent/30"
          : "border-border bg-surface-2 hover:border-border-strong",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", active ? "text-accent" : "text-fg-muted")} />
        <span className={cn("text-sm font-medium", active ? "text-accent" : "text-fg")}>{label}</span>
        {active ? <span className="ml-auto text-[10px] uppercase tracking-wider text-accent">Active</span> : null}
      </div>
      <div
        className={cn(
          "h-16 rounded border",
          preview === "dark" ? "border-[#2A4A66] bg-[#0F2030]" : "border-[#DCE3EA] bg-[#F2F5F8]",
        )}
      >
        <div
          className={cn(
            "mt-2 ml-2 h-2 w-12 rounded-full",
            preview === "dark" ? "bg-[#FFA300]" : "bg-[#E68A00]",
          )}
        />
        <div className="ml-2 mt-1 flex gap-1">
          <div className={cn("h-1.5 w-8 rounded", preview === "dark" ? "bg-[#F0F4F7]/40" : "bg-[#0F2030]/30")} />
          <div className={cn("h-1.5 w-6 rounded", preview === "dark" ? "bg-[#93A4B5]/40" : "bg-[#5A6C7D]/30")} />
        </div>
      </div>
      <p className="text-xs text-fg-muted">{description}</p>
    </button>
  )
}
