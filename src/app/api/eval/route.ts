import { bathroomDoorBlocked, ingestRoomplan, type RoomPlanPayload } from "@/lib/geometry"
import { NextResponse } from "next/server"

export async function GET() {
  const door = bathroomDoorBlocked()
  return NextResponse.json({
    check: "bathroom_door_vs_walker",
    pass: door.blocked === true,
    expected: "27.1in door does not clear 28in walker",
    result: door,
  })
}

export async function POST(req: Request) {
  const body = (await req.json()) as RoomPlanPayload
  return NextResponse.json({ measurements: ingestRoomplan(body) })
}
