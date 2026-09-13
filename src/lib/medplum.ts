import { bathroomDoorBlocked } from "@/lib/geometry"
import { coverageChecks, fhirDrafts, patient } from "@/lib/demo-data"

export type MedplumDocument = {
  resourceType: "DocumentReference"
  id: string
  status: "current"
  type: { text: string }
  subject: { reference: string; display: string }
  description: string
  content: { attachment: { contentType: string; data?: string; title: string } }[]
}

const NOTE = `Discharge summary — ${patient.name}

76F, osteoporosis, deconditioned after hospital + SNF rehab. Lives alone. Uses a 28-inch front-wheeled walker. Going home Friday.

Plan: PT/OT, pain control, social work for home support. Formal pre-discharge assessment of mobility and home setup. Discharge home once safe.`

let pulled = false
const writebacks: Record<string, unknown>[] = []

/** Live swap: OAuth against MEDPLUM_BASE_URL, then GET DocumentReference. */
export function getDischargeNote() {
  pulled = true
  const doc: MedplumDocument = {
    resourceType: "DocumentReference",
    id: "doc-discharge-monica",
    status: "current",
    type: { text: "Discharge summary" },
    subject: { reference: `Patient/${patient.id}`, display: patient.name },
    description: "Latest discharge note",
    content: [
      {
        attachment: {
          contentType: "text/plain",
          title: "Discharge summary",
          data: Buffer.from(NOTE).toString("base64"),
        },
      },
    ],
  }
  return {
    app: "Medplum",
    action: "DocumentReference.search",
    mock: !process.env.MEDPLUM_CLIENT_SECRET,
    document: doc,
    note: NOTE,
    equipment: { walker_width_in: 28 },
  }
}

/** Live swap: POST Bundle to Medplum FHIR endpoint. */
export function writeDraftBundle() {
  const door = bathroomDoorBlocked()
  const bundle = {
    resourceType: "Bundle",
    type: "transaction",
    meta: {
      tag: [{ code: "DRAFT", display: "Requires clinician review — not auto-sent" }],
    },
    entry: fhirDrafts.map((r) => ({
      resource: {
        ...r,
        subject: { reference: `Patient/${patient.id}`, display: patient.name },
      },
      request: { method: "POST", url: r.resourceType },
    })),
  }
  writebacks.push({ at: new Date().toISOString(), door, bundle })
  return {
    app: "Medplum",
    action: "Bundle.create",
    mock: !process.env.MEDPLUM_CLIENT_SECRET,
    id: `wb-${writebacks.length}`,
    blocked: door.blocked,
    coverage: coverageChecks,
    bundle,
  }
}

export function medplumStatus() {
  return { pulled, writebacks: writebacks.length }
}
