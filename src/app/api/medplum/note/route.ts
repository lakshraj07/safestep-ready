import { getDischargeNote } from "@/lib/medplum"
import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(getDischargeNote())
}
