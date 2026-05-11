import { listNcrPhotos, getNcrSummary } from "@/lib/drive/ncr"

export const dynamic = "force-dynamic"

export default async function NcrPage() {
  if (!process.env.GOOGLE_NCR_FOLDER_ID) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-cream">NCR Photos</h1>
        <div className="rounded-xl border border-rule bg-ink/40 p-4 text-sm">
          <p className="text-muted">
            Set <code className="rounded bg-rule px-1 py-0.5">GOOGLE_NCR_FOLDER_ID</code> in env (the Google Drive folder ID where WhatsApp NCR photos are saved). Service account{" "}
            <code className="rounded bg-rule px-1 py-0.5">aios-sheet-reader@mesmerizing-bee-481701-j6.iam.gserviceaccount.com</code> needs Viewer access on the folder.
          </p>
        </div>
      </section>
    )
  }

  let summary: Awaited<ReturnType<typeof getNcrSummary>> | null = null
  let photos: Awaited<ReturnType<typeof listNcrPhotos>>["photos"] = []
  let error: string | null = null
  try {
    ;[summary, { photos }] = await Promise.all([getNcrSummary(), listNcrPhotos({ limit: 200 })])
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream">NCR Photos</h1>
        <p className="mt-1 text-sm text-muted">From WhatsApp captures, end-of-job defect review.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          <p className="font-semibold text-red-300">Error</p>
          <p className="mt-1 text-xs text-muted">{error}</p>
        </div>
      ) : null}

      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-rule bg-ink/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted">Total</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-cream">{summary.total}</p>
          </div>
          {Object.entries(summary.byDefectType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([k, v]) => (
              <div key={k} className="rounded-xl border border-rule bg-ink/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted">{k}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-cream">{v}</p>
              </div>
            ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((p) => (
          <a
            key={p.id}
            href={p.webViewLink}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-rule bg-ink/40 p-2 hover:border-border-strong"
          >
            {p.thumbnailLink ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.thumbnailLink} alt={p.name} className="aspect-square w-full rounded object-cover" />
            ) : (
              <div className="flex aspect-square items-center justify-center rounded bg-rule/30 text-[10px] text-muted">
                no preview
              </div>
            )}
            <p className="mt-1 truncate text-[11px] text-cream">{p.parsedAssembly ?? "?"}</p>
            <p className="truncate text-[10px] text-muted">{p.parsedDefectType}</p>
          </a>
        ))}
      </div>
    </section>
  )
}
