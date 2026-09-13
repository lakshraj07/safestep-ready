export const problem =
  "Discharge plans say “home once safe,” but nobody checks whether the home can take the patient."

export const solution = [
  "SafeStep reads Patient / Encounter / DocumentReference from Medplum, Twilio auto-texts a family member the iPhone link, and Riley (Vapi and/or ElevenLabs) runs a gathering-mode walk — RoomPlan LiDAR, YOLOv3 AR boxes, Haiku fast-pass, Sonnet STEADI/HSSAT — then scores obligations against the home.",
  "Draft Observations, ServiceRequests (HCPCS + Original Medicare vs MA), and Tasks land in Medplum for a human to check coverage and approve. Nothing is auto-sent.",
]

export const workflow = [
  { step: "1", app: "Medplum", does: "Pull discharge note + 28 in walker; derive obligations." },
  { step: "2", app: "Twilio", does: "Auto-texts Maya the walkthrough link on handoff." },
  { step: "3", app: "Vapi / ElevenLabs", does: "Riley guides the iPhone scan (gathering mode)." },
  { step: "4", app: "Medplum", does: "Draft FHIR + Medicare/insurance coverage in the PIMS." },
]

export const tech = [
  "Medplum — Patient, Encounter, DocumentReference (note + AVS). Obligations: verified / at_risk / blocked / unverified.",
  "Twilio auto-SMS. iPhone: RoomPlan + YOLOv3; Haiku ~1.3s/frame; Sonnet STEADI/HSSAT. Riley = Vapi and/or ElevenLabs → /v1/chat/completions.",
  "Medplum PIMS — draft Observation / ServiceRequest / Task with HCPCS + Original Medicare vs MA. Escalation: expected / observed / why / owner / deadline.",
]

export const agents = [
  {
    id: "chart",
    name: "Chart agent",
    app: "Medplum",
    does: "Read Patient, Encounter, DocumentReference (discharge note). Derive walker width and home-check obligations.",
  },
  {
    id: "home",
    name: "Home agent",
    app: "Twilio + Vapi / ElevenLabs + iPhone",
    does: "Twilio auto-texts the link. Riley (Vapi or ElevenLabs) guides the iPhone scan. Geometry scores every door against the walker.",
  },
  {
    id: "writeback",
    name: "Write-back agent",
    app: "Medplum",
    does: "POST a draft FHIR Bundle to Medplum. Care team checks records and Medicare/MA coverage. Never auto-finalized.",
  },
]

export const externalApps = [
  {
    name: "Medplum",
    role: "EHR",
    actions: ["GET discharge note", "POST draft Observation / Task / ServiceRequest"],
  },
  {
    name: "Twilio",
    role: "Family outreach",
    actions: ["SMS walkthrough link", "SMS “results are back” to the discharging unit"],
  },
  {
    name: "Vapi / ElevenLabs",
    role: "Voice agent",
    actions: [
      "Start Riley (gathering mode)",
      "Custom LLM webhook = SafeStep brain",
    ],
  },
]
