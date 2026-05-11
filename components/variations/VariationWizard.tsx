"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type LineItem = {
  description: string
  quantity: number
  unit: string
  rate: number
}

type Step = 1 | 2 | 3

export function VariationWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [variationNumber, setVariationNumber] = useState("")
  const [title, setTitle] = useState("")
  const [lines, setLines] = useState<LineItem[]>([{ description: "", quantity: 1, unit: "ea", rate: 0 }])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = lines.reduce((s, l) => s + l.quantity * l.rate, 0)

  function addLine() {
    setLines([...lines, { description: "", quantity: 1, unit: "ea", rate: 0 }])
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx))
  }

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  async function submit() {
    setPending(true)
    setError(null)
    try {
      const project = await fetch("/api/projects/current").then((r) => r.json()).catch(() => null)
      const projectId = project?.id ?? ""
      if (!projectId) throw new Error("Could not resolve current project ID")

      const created = await fetch("/api/variations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variationNumber, title, projectId }),
      }).then((r) => r.json())
      if (!created.id) throw new Error(created.error ?? "Failed to create variation")

      for (const l of lines) {
        if (!l.description) continue
        const r = await fetch(`/api/variations/${created.id}/lines`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            rate: l.rate,
          }),
        })
        if (!r.ok) {
          const err = await r.json().catch(() => ({}))
          throw new Error(err.error ?? `Line item failed: HTTP ${r.status}`)
        }
      }

      router.push(`/variations/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs">
        <StepBadge active={step >= 1} done={step > 1} label="1. Details" />
        <span className="text-muted">/</span>
        <StepBadge active={step >= 2} done={step > 2} label="2. Line items" />
        <span className="text-muted">/</span>
        <StepBadge active={step >= 3} done={false} label="3. Review" />
      </div>

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3 rounded-xl border border-rule bg-ink/40 p-4">
          <Field label="Variation number" hint="e.g. V-411-015">
            <input
              value={variationNumber}
              onChange={(e) => setVariationNumber(e.target.value)}
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-cream"
              placeholder="V-411-015"
            />
          </Field>
          <Field label="Title" hint="Short description AW Edwards will see">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-cream"
              placeholder="L4 baffle screen, additional brackets"
            />
          </Field>
          <div className="flex justify-end">
            <button
              disabled={!variationNumber || !title}
              onClick={() => setStep(2)}
              className="rounded-md border border-border-strong bg-highlight px-4 py-2 text-sm font-medium text-fg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3 rounded-xl border border-rule bg-ink/40 p-4">
          <table className="w-full text-xs">
            <thead className="border-b border-rule">
              <tr>
                <th className="py-2 text-left font-medium text-muted">Description</th>
                <th className="py-2 text-right font-medium text-muted">Qty</th>
                <th className="py-2 text-right font-medium text-muted">Unit</th>
                <th className="py-2 text-right font-medium text-muted">Rate</th>
                <th className="py-2 text-right font-medium text-muted">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-b border-rule/30">
                  <td className="py-1.5">
                    <input
                      value={l.description}
                      onChange={(e) => updateLine(i, { description: e.target.value })}
                      className="w-full rounded border border-rule bg-ink px-2 py-1 text-cream"
                    />
                  </td>
                  <td className="py-1.5 text-right">
                    <input
                      type="number"
                      value={l.quantity}
                      onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                      className="w-16 rounded border border-rule bg-ink px-2 py-1 text-right text-cream"
                    />
                  </td>
                  <td className="py-1.5 text-right">
                    <input
                      value={l.unit}
                      onChange={(e) => updateLine(i, { unit: e.target.value })}
                      className="w-16 rounded border border-rule bg-ink px-2 py-1 text-right text-cream"
                    />
                  </td>
                  <td className="py-1.5 text-right">
                    <input
                      type="number"
                      value={l.rate}
                      onChange={(e) => updateLine(i, { rate: Number(e.target.value) })}
                      className="w-24 rounded border border-rule bg-ink px-2 py-1 text-right text-cream"
                    />
                  </td>
                  <td className="py-1.5 text-right text-cream">
                    ${(l.quantity * l.rate).toFixed(0)}
                  </td>
                  <td className="py-1.5 text-right">
                    {lines.length > 1 ? (
                      <button onClick={() => removeLine(i)} className="text-muted hover:text-red-400">
                        x
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} className="pt-2 text-right text-muted">
                  Total
                </td>
                <td className="pt-2 text-right text-base font-semibold text-cream">
                  ${total.toFixed(0)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
          <div className="flex items-center justify-between">
            <button onClick={addLine} className="text-xs text-fg hover:underline">
              + Add line
            </button>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="rounded-md border border-rule px-3 py-2 text-xs text-cream">
                Back
              </button>
              <button
                disabled={lines.every((l) => !l.description)}
                onClick={() => setStep(3)}
                className="rounded-md border border-border-strong bg-highlight px-4 py-2 text-sm font-medium text-fg disabled:opacity-50"
              >
                Review
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3 rounded-xl border border-rule bg-ink/40 p-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">Variation</p>
            <p className="text-base font-semibold text-cream">
              {variationNumber} - {title}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wider text-muted">Line items</p>
            <ul className="space-y-1 text-sm">
              {lines.filter((l) => l.description).map((l, i) => (
                <li key={i} className="flex justify-between border-b border-rule/30 py-1">
                  <span>
                    {l.description} <span className="text-muted">({l.quantity} {l.unit} @ ${l.rate})</span>
                  </span>
                  <span className="text-cream">${(l.quantity * l.rate).toFixed(0)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-right text-base font-semibold text-cream">Total: ${total.toFixed(0)}</p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setStep(2)} className="rounded-md border border-rule px-3 py-2 text-xs text-cream">
              Back
            </button>
            <button
              disabled={pending}
              onClick={submit}
              className="rounded-md border border-border-strong bg-highlight px-4 py-2 text-sm font-medium text-fg disabled:opacity-50"
            >
              {pending ? "Creating..." : "Create variation"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StepBadge({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span
      className={`rounded px-2 py-1 ${
        done ? "bg-emerald-500/20 text-emerald-300" : active ? "bg-highlight/60 text-fg" : "bg-rule/20 text-muted"
      }`}
    >
      {label}
    </span>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  )
}
