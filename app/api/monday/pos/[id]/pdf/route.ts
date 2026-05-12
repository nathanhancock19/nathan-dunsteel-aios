/**
 * Proxies a Monday.com PO invoice PDF so the user doesn't need to log
 * into Monday to view it.
 *
 * GET /api/monday/pos/:id/pdf
 *  - Fetches item assets via Monday GraphQL
 *  - Finds the first PDF asset
 *  - Streams it back with Content-Disposition: inline
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { mondayQuery } from "@/lib/monday"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type AssetData = {
  data: {
    items: Array<{
      assets: Array<{
        id: string
        name: string
        url: string
        file_extension: string
        public_url: string
      }>
    }>
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = params
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  try {
    const data = await mondayQuery<AssetData["data"]>(
      `query ($id: [ID!]!) {
        items(ids: $id) {
          assets {
            id
            name
            url
            file_extension
            public_url
          }
        }
      }`,
      { id: [id] },
    )

    const assets = data.items[0]?.assets ?? []
    const pdf = assets.find(
      (a) => a.file_extension?.toLowerCase() === "pdf" || a.name?.toLowerCase().endsWith(".pdf"),
    ) ?? assets[0]

    if (!pdf) {
      return NextResponse.json({ error: "No file attached to this PO" }, { status: 404 })
    }

    // Monday public_url is a signed URL - fetch and proxy
    const fileUrl = pdf.public_url || pdf.url
    const fileRes = await fetch(fileUrl, { cache: "no-store" })
    if (!fileRes.ok) {
      return NextResponse.json({ error: `File fetch failed: ${fileRes.status}` }, { status: 502 })
    }

    const blob = await fileRes.arrayBuffer()
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdf.name}"`,
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
