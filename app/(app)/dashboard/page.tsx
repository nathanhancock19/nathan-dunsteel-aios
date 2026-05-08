import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  return (
    <section>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Morning, {session?.user?.name?.split(" ")[0] ?? "Nathan"}.</h1>
      <p className="text-sm text-neutral-400">
        Phase 1 placeholder. Dashboard widgets land in Phase 2.
      </p>
    </section>
  )
}
