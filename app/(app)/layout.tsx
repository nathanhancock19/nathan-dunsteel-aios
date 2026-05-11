import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ReactNode } from "react"
import { AssistantPanel } from "@/components/assistant/AssistantPanel"
import { QuickNoteButton } from "@/components/quick-actions/QuickNoteButton"
import { Sidebar } from "@/components/shell/Sidebar"
import { MobileTopbar } from "@/components/shell/MobileTopbar"
import { HelpButton } from "@/components/shell/HelpButton"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const name = session.user?.name ?? "Nathan Hancock"
  const role = "PM + AI Lead"

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      {/* Desktop sidebar (fixed, off-flow) */}
      <div className="hidden md:block">
        <Sidebar name={name} role={role} />
      </div>

      {/* Mobile top bar with hamburger (opens sheet) */}
      <MobileTopbar name={name} role={role} />

      {/* Content area, offset to clear the fixed sidebar on desktop */}
      <div className="flex w-full flex-1 flex-col md:pl-60">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>

      <QuickNoteButton />
      <HelpButton />
      <AssistantPanel />
    </div>
  )
}
