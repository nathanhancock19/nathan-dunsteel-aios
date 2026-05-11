import type { DiaryEntry } from "@/lib/notion/diary"

export function DiaryEntryCard({ entry }: { entry: DiaryEntry }) {
  const flag = entry.safetyIncident || entry.builderDelays
  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noreferrer"
      className={`block rounded-lg border p-3 text-sm hover:border-signal ${
        flag ? "border-signal/40 bg-signal/5" : "border-rule bg-ink/40"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-medium text-cream">{entry.title}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted">{entry.source === "performance" ? "Performance" : "Subcon"}</span>
      </div>
      {entry.workCompleted ? (
        <p className="line-clamp-2 text-xs text-muted">{entry.workCompleted}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-muted">
        {entry.date ? <span>{entry.date}</span> : null}
        {entry.crewOnsite != null ? <span>Crew: {entry.crewOnsite}</span> : null}
        {entry.weather ? <span>{entry.weather}</span> : null}
        {entry.hoursLost != null && entry.hoursLost > 0 ? <span className="text-yellow-400">{entry.hoursLost}h lost</span> : null}
        {entry.safetyIncident ? <span className="text-red-400">Safety incident</span> : null}
        {entry.builderDelays ? <span className="text-yellow-400">Builder delay</span> : null}
        {entry.invoiced && entry.source === "subcon" ? <span>{entry.invoiced}</span> : null}
      </div>
    </a>
  )
}
