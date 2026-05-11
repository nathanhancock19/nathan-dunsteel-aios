import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { listRecords, TABLES } from "@/lib/airtable"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const project = process.env.AIOS_PRIMARY_PROJECT_NUMBER ?? "411"
  try {
    const records = await listRecords(TABLES.PROJECTS, {
      filterByFormula: `FIND("${project}", {Project Number})`,
      maxRecords: 1,
      fields: ["Project Number", "Strumus Name", "Status"],
    })
    const r = records[0]
    if (!r) return NextResponse.json({ error: "Project not found" }, { status: 404 })
    return NextResponse.json({
      id: r.id,
      number: String(r.fields["Project Number"] ?? ""),
      name: String(r.fields["Strumus Name"] ?? ""),
      status: String(r.fields["Status"] ?? ""),
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
