import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { Sidebar } from "@/components/shell/Sidebar"
import { MobileTopbar } from "@/components/shell/MobileTopbar"

export default async function ShellLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const name = session.user?.name ?? "Nathan Hancock"
  const role = "PM + AI Lead"

  return (
    <div className="relative h-screen overflow-hidden bg-bg text-fg">
      <div className="hidden md:block">
        <Sidebar name={name} role={role} />
      </div>
      <MobileTopbar name={name} role={role} />
      {/* Absolute fill: below topbar on mobile, offset past sidebar on desktop */}
      <div className="absolute inset-x-0 top-14 bottom-0 overflow-hidden md:top-0 md:left-60">
        {children}
      </div>
    </div>
  )
}
