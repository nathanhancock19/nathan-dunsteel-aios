import Link from "next/link"
import { User, Plug, Bell, Palette, KeyRound } from "lucide-react"
import type { ReactNode } from "react"

const SECTIONS = [
  { href: "/settings/profile", icon: User, label: "Profile" },
  { href: "/settings/integrations", icon: Plug, label: "Integrations" },
  { href: "/settings/notifications", icon: Bell, label: "Notifications" },
  { href: "/settings/theme", icon: Palette, label: "Appearance" },
  { href: "/settings/api", icon: KeyRound, label: "API & Env" },
] as const

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <section>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Settings</h1>
        <p className="mt-1 text-sm text-fg-muted">Profile, integrations, notifications, theme, and config.</p>
      </div>
      <div className="flex flex-col gap-5 md:flex-row md:gap-8">
        <nav className="shrink-0 md:w-48">
          <ul className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5">
            {SECTIONS.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  <s.icon className="h-4 w-4" />
                  <span>{s.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </section>
  )
}
