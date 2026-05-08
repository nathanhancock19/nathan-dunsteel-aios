import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ReactNode } from "react"

async function signOutAction() {
  "use server"
  await signOut({ redirectTo: "/login" })
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
            Dunsteel PM AIOS
          </Link>
          <nav className="flex items-center gap-4 text-sm text-neutral-400">
            <Link href="/dashboard" className="hover:text-neutral-100">Dashboard</Link>
            <Link href="/modules" className="hover:text-neutral-100">Modules</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-neutral-400">
          <span>{session.user?.name}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-md border border-neutral-700 px-3 py-1 text-xs hover:border-neutral-500 hover:text-neutral-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  )
}
