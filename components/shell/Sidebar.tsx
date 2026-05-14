"use client"

import {
  Home,
  Inbox,
  BookOpen,
  ShieldAlert,
  DollarSign,
  FileText,
  CheckSquare,
  Truck,
  Camera,
  ExternalLink,
  FolderKanban,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Logo } from "./Logo"
import { SidebarItem } from "./SidebarItem"
import { SidebarSection } from "./SidebarSection"
import { UserWidget } from "./UserWidget"
import { cn } from "@/lib/utils/cn"

const COLLAPSE_KEY = "aios-sidebar-collapsed"

export function Sidebar({
  name,
  role,
  onItemClick,
  forceMobile,
}: {
  name: string
  role?: string
  onItemClick?: () => void
  forceMobile?: boolean
}) {
  // Collapsed state (desktop only). On mobile, sidebar always shows full width
  // inside the Sheet.
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
    if (forceMobile) return
    try {
      const stored = localStorage.getItem(COLLAPSE_KEY)
      setCollapsed(stored === "true")
    } catch {}
  }, [forceMobile])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSE_KEY, String(next))
    } catch {}
  }

  const expanded = forceMobile || !collapsed
  const widthClass = forceMobile ? "w-full" : collapsed ? "w-16" : "w-60"

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200",
        widthClass,
        forceMobile ? "" : "fixed left-0 top-0 z-30",
      )}
      aria-label="Primary navigation"
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-3">
        {expanded ? (
          <Logo size="sm" showName className="h-7" />
        ) : (
          <Logo size="sm" showName={false} className="h-7" />
        )}
        {!forceMobile ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg md:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      <nav className={cn("flex-1 overflow-y-auto py-2", !expanded && "px-0")}>
        {expanded ? (
          <>
            <SidebarSection title="Today">
              <SidebarItem href="/dashboard" icon={Home} label="Dashboard" onClick={onItemClick} />
              <SidebarItem href="/dashboard?tab=inbox" icon={Inbox} label="Inbox" onClick={onItemClick} />
              <SidebarItem href="/chat" icon={MessageSquare} label="AI Chat" onClick={onItemClick} />
            </SidebarSection>

            <SidebarSection title="Project">
              <SidebarItem href="/diary" icon={BookOpen} label="Diary" onClick={onItemClick} />
              <SidebarItem href="/defects" icon={ShieldAlert} label="Defects" onClick={onItemClick} />
            </SidebarSection>

            <SidebarSection title="Commercial">
              <SidebarItem href="/budget" icon={DollarSign} label="Budget" onClick={onItemClick} />
              <SidebarItem href="/variations" icon={FileText} label="Variations" onClick={onItemClick} />
              <SidebarItem href="/approvals" icon={CheckSquare} label="Approvals" onClick={onItemClick} />
            </SidebarSection>

            <SidebarSection title="Operations">
              <SidebarItem href="/deliveries" icon={Truck} label="Deliveries" onClick={onItemClick} />
              <SidebarItem href="/ncr" icon={Camera} label="NCR" onClick={onItemClick} />
            </SidebarSection>

            <SidebarSection title="External">
              <SidebarItem href="/projects" icon={FolderKanban} label="Projects" onClick={onItemClick} />
              <SidebarItem href="/modules" icon={ExternalLink} label="Modules" onClick={onItemClick} />
            </SidebarSection>

            <SidebarSection>
              <SidebarItem href="/settings" icon={Settings} label="Settings" onClick={onItemClick} />
            </SidebarSection>
          </>
        ) : (
          // Collapsed: icon-only stack
          <div className="flex flex-col items-center gap-1 px-1 py-1">
            {hydrated && [
              { href: "/dashboard", icon: Home, label: "Dashboard" },
              { href: "/chat", icon: MessageSquare, label: "AI Chat" },
              { href: "/budget", icon: DollarSign, label: "Budget" },
              { href: "/diary", icon: BookOpen, label: "Diary" },
              { href: "/defects", icon: ShieldAlert, label: "Defects" },
              { href: "/variations", icon: FileText, label: "Variations" },
              { href: "/approvals", icon: CheckSquare, label: "Approvals" },
              { href: "/deliveries", icon: Truck, label: "Deliveries" },
              { href: "/ncr", icon: Camera, label: "NCR" },
              { href: "/projects", icon: FolderKanban, label: "Projects" },
              { href: "/modules", icon: ExternalLink, label: "Modules" },
              { href: "/settings", icon: Settings, label: "Settings" },
            ].map((item) => (
              <CollapsedItem key={item.href} {...item} />
            ))}
          </div>
        )}
      </nav>

      <UserWidget name={name} role={role} />
    </aside>
  )
}

function CollapsedItem({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: typeof Home
  label: string
}) {
  return (
    <a
      href={href}
      title={label}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      <Icon className="h-4 w-4" />
    </a>
  )
}
