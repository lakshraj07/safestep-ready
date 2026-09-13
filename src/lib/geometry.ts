/** Port of engine/backend/geometry.py — doorway width vs walker. */
export const WALKER_WIDTH_IN = 28.0
const M_TO_IN = 39.3701

export type RoomPlanPayload = {
  room?: string
  doors?: { width_m?: number }[]
  openings?: { width_m?: number }[]
  floor_area_m2?: number
}

export type Measurement = {
  label: string
  room: string
  kind: string
  width_in?: number
  walker_clears?: boolean
  text: string
}

export function ingestRoomplan(payload: RoomPlanPayload): Measurement[] {
  const room = payload.room ?? "room"
  const out: Measurement[] = []

  for (const kind of ["doors", "openings"] as const) {
    for (const d of payload[kind] ?? []) {
      const w_m = d.width_m
      if (!w_m) continue
      const w_in = Math.round(w_m * M_TO_IN * 10) / 10
      if (w_in > 60) {
        out.push({
          label: `${room} wide opening`,
          room,
          kind: "span",
          width_in: w_in,
          text: `${w_in}in open span — not a doorway`,
        })
        continue
      }
      const clears = w_in >= WALKER_WIDTH_IN + 1
      const noun = kind === "doors" ? "door" : "opening"
      const text = clears
        ? `${w_in}in — clears Monica's ${WALKER_WIDTH_IN.toFixed(0)}in walker`
        : `${w_in}in — Monica's walker is ${WALKER_WIDTH_IN.toFixed(0)}in wide; it will NOT fit through this ${noun}`
      out.push({
        label: `${room} ${noun} width`,
        room,
        kind: noun,
        width_in: w_in,
        walker_clears: clears,
        text,
      })
    }
  }

  const area = payload.floor_area_m2
  if (area) {
    out.push({
      label: `${room} floor area`,
      room,
      kind: "area",
      text: `${area.toFixed(1)} m² (${Math.round(area * 10.764)} sq ft)`,
    })
  }
  return out
}

/** Reliability check used in /api/eval — the blocker the rest of the workflow hangs on. */
export function bathroomDoorBlocked(width_m = 0.701) {
  const [m] = ingestRoomplan({ room: "bathroom", doors: [{ width_m }] })
  return {
    width_in: m?.width_in,
    walker_clears: m?.walker_clears === true,
    blocked: m?.walker_clears === false,
    text: m?.text,
  }
}
