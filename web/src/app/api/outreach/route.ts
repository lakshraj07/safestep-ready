import { sendFamilySms, startRileySession } from "@/lib/outreach"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { kind } = (await req.json().catch(() => ({}))) as { kind?: string }
  if (kind === "voice") return NextResponse.json(startRileySession())
  return NextResponse.json(sendFamilySms())
}
