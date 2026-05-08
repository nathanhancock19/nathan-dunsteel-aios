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
    <div className="mb-6 flex items-baseline justify-between border-b border-neutral-800 pb-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {name.split(" ")[0]}.
        </h1>
        <p className="text-sm text-neutral-400">
          {weekday}, {date}
        </p>
      </div>
      <p className="text-xs text-neutral-500">Weather: TBD</p>
    </div>
  )
}

function pickGreeting(hour: number): string {
  if (hour < 12) return "Morning"
  if (hour < 18) return "Afternoon"
  return "Evening"
}
