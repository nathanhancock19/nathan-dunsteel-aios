import { auth } from "@/lib/auth"
import { Card } from "@/components/ui/Card"
import { User } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const session = await auth()
  const name = session?.user?.name ?? "Nathan Hancock"
  const email = session?.user?.email ?? "nathanh@dunsteel.com.au"
  const role = "PM + AI Lead"
  const project = process.env.AIOS_PRIMARY_PROJECT_NUMBER ?? "411"
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="space-y-5">
      <Card title="Profile" icon={User}>
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-steel-700 text-lg font-semibold text-fg ring-2 ring-border">
            {initials}
          </div>
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" value={name} />
            <Field label="Email" value={email} />
            <Field label="Role" value={role} />
            <Field label="Primary project" value={project} />
          </div>
        </div>
      </Card>

      <Card title="Account">
        <p className="text-sm text-fg-muted">
          Single-user mode. Multi-user (PM team) is a v2 feature. Sign out from the
          user widget at the bottom of the sidebar.
        </p>
      </Card>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
      <p className="mt-0.5 text-sm text-fg">{value}</p>
    </div>
  )
}
