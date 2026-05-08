import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ReactNode } from "react"
import { AssistantPanel } from "@/components/assistant/AssistantPanel"

async function signOutAction() {
  "use server"
  await signOut({ redirectTo: "/login" })
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen bg-ink text-cream">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="inline-block h-2 w-2 rounded-full bg-signal" aria-hidden />
            <span>Dunsteel PM AIOS</span>
          </Link>
          <nav className="flex items-center gap-4 text-xs font-medium uppercase tracking-wider text-muted sm:text-[11px]">
            <Link href="/dashboard" className="hover:text-cream">Dashboard</Link>
            <Link href="/deliveries" className="hover:text-cream">Deliveries</Link>
            <Link href="/approvals" className="hover:text-cream">Approvals</Link>
            <Link href="/projects" className="hover:text-cream">Projects</Link>
            <Link href="/modules" className="hover:text-cream">Modules</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="hidden sm:inline">{session.user?.name}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-md border border-rule px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted hover:border-muted hover:text-cream"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <AssistantPanel />
    </div>
  )
}
