export function TodayBar({ name }: { name: string }) {
  const now = new Date()
  const weekday = now.toLocaleDateString("en-AU", { weekday: "long" })
  const date = now.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const greeting = pickGreeting(now.getHours())

  return (
    <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream">
          {greeting}, {name.split(" ")[0]}.
        </h1>
        <p className="text-sm text-muted">
          {weekday}, {date}
        </p>
      </div>
      <p className="label">{now.toLocaleDateString("en-CA")}</p>
    </div>
  )
}

function pickGreeting(hour: number): string {
  if (hour < 12) return "Morning"
  if (hour < 18) return "Afternoon"
  return "Evening"
}
