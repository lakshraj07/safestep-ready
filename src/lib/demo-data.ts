export const WALKER_WIDTH_IN = 28

export const patient = {
  id: "monica",
  name: "Monica Hilpert",
  age: 76,
  sex: "F",
  mrn: "MRN-441082",
  location: "Somerville, MA — lives alone",
  visitTitle: "SNF admission — rehabilitation and pain management",
  dischargeTarget: "Friday",
  mobility: "28-inch front-wheeled walker; fearful of standing; limited tolerance",
  support: "Neighbor only; socially isolated",
}

export const planItems = [
  "PT for safe transfers, standing tolerance, gait, and strengthening",
  "OT for dressing, bathing safety, and daily activities",
  "Pain management with monitoring for sedation, confusion, and unsteadiness",
  "Dietitian support for soft, protein- and calcium-forward meals",
  "Social work to arrange home support before discharge",
  "Formal pre-discharge assessment: mobility, medication management, meal management, home setup",
  "Discharge home once safe",
]

export const encounterNote = `Monica Hilpert, 76F. Osteoporosis. Deconditioned after hospital + SNF. Lives alone. 28-inch front-wheeled walker. Home Friday.

Plan: PT/OT, pain control, social work for support. Confirm home setup before discharge. Discharge home once safe.`

export const handoffMessage = `SafeStep: Monica's care team needs a 10-minute phone walk of the apartment before Friday. Open this link when you are there — Riley will guide you.`

export type Confirmation = {
  id: string
  question: string
  source: "room" | "lidar" | "vision"
}

export type WalkEvent = {
  t: number
  kind: "riley" | "scan" | "measure" | "vision"
  text: string
}

export type RoomScript = {
  id: string
  name: string
  prompt: string
  confirmation: Confirmation
  events: WalkEvent[]
  detections: { label: string; x: number; y: number; w: number; h: number }[]
}

export const rooms: RoomScript[] = [
  {
    id: "entry",
    name: "Entry / hallway",
    prompt:
      "Let's start at the front door. Hold the device so I can see the floor and the path Monica would walk.",
    confirmation: {
      id: "c-entry",
      question: "Just to check — is this Monica's front door / entry area?",
      source: "room",
    },
    events: [
      { t: 200, kind: "riley", text: "Take a slow pan down the hallway — the path she would walk." },
      { t: 900, kind: "scan", text: "Entry mapped" },
      { t: 1400, kind: "vision", text: "Floor lip in the main path" },
      { t: 1900, kind: "measure", text: "Entry door 30.4 in — clears the 28 in walker" },
    ],
    detections: [
      { label: "floor transition", x: 18, y: 58, w: 44, h: 18 },
      { label: "threshold lip", x: 52, y: 62, w: 22, h: 12 },
    ],
  },
  {
    id: "living",
    name: "Living area",
    prompt:
      "Walk toward the living area. Keep the camera at walker height if you can.",
    confirmation: {
      id: "c-living",
      question: "Is this the main living area Monica would sit and walk through?",
      source: "room",
    },
    events: [
      { t: 200, kind: "riley", text: "If something is in the walking path, hold on it." },
      { t: 900, kind: "vision", text: "Ankle-height clutter in the path" },
      { t: 1500, kind: "vision", text: "Cord along the baseboard" },
    ],
    detections: [
      { label: "path clutter", x: 28, y: 48, w: 30, h: 22 },
      { label: "cord", x: 8, y: 70, w: 36, h: 10 },
    ],
  },
  {
    id: "kitchen",
    name: "Kitchen",
    prompt: "Now the kitchen — especially the path from the table to the sink and fridge.",
    confirmation: {
      id: "c-kitchen",
      question: "Is this the kitchen Monica would use for meals?",
      source: "room",
    },
    events: [
      { t: 200, kind: "riley", text: "Show the path from table to sink." },
      { t: 1100, kind: "scan", text: "Kitchen opening 33.8 in — clears the walker" },
    ],
    detections: [{ label: "prep zone", x: 40, y: 32, w: 38, h: 28 }],
  },
  {
    id: "bathroom",
    name: "Bathroom",
    prompt: "Last stop is the bathroom. Hold on the doorway, then step inside if you can.",
    confirmation: {
      id: "c-bath",
      question:
        "I measured this door at 27.6 in — does Monica pass through it day-to-day?",
      source: "lidar",
    },
    events: [
      { t: 200, kind: "riley", text: "Pause on the bathroom doorway so I can measure it." },
      { t: 1000, kind: "measure", text: "Bathroom door 27.6 in — walker is 28 in; it will NOT fit" },
      { t: 1600, kind: "riley", text: "That's enough. I have what the care team needs." },
    ],
    detections: [
      { label: "door 27.6 in", x: 34, y: 18, w: 28, h: 62 },
    ],
  },
]

export type ObligationStatus = "blocked" | "at_risk" | "verified" | "unverified"

export const obligations: {
  status: ObligationStatus
  title: string
  quote: string
  evidence: string
}[] = [
  {
    status: "blocked",
    title:
      "Ensure the 28-inch front-wheeled walker is present, correctly fitted, and used for all standing and ambulation at home.",
    quote: "uses a 28in front-wheeled walker",
    evidence:
      "Measurement shows a doorway is only 27.6 in wide while Monica's walker is 28 in wide, so it will NOT fit through this door.",
  },
  {
    status: "at_risk",
    title:
      "Verify Monica can perform standing transfers and short-distance ambulation safely without another person present before she is left alone at home.",
    quote: "lives alone; fearful of standing",
    evidence:
      "Path clutter, flooring transitions, and no hallway supports raise fall risk during unsupervised ambulation.",
  },
  {
    status: "at_risk",
    title: "Confirm bathroom access for toileting and bathing with her current mobility device.",
    quote: "OT for bathing safety",
    evidence: "Bathroom doorway fails walker clearance; no grab bars observed.",
  },
  {
    status: "unverified",
    title: "Arrange home support before discharge (social work).",
    quote: "neighbor is only nearby help",
    evidence: "Walkthrough cannot verify scheduled caregiver coverage.",
  },
  {
    status: "verified",
    title: "Entry door width is compatible with the prescribed walker.",
    quote: "discharge home once safe",
    evidence: "Entry door measured 30.4 in — clears 28 in walker with margin.",
  },
]

export const findings: {
  severity: "critical" | "high" | "moderate"
  title: string
  why: string
  rec: string
  instrument: string
}[] = [
  {
    severity: "critical",
    title: "Bathroom doorway 27.6 in vs 28 in walker — discharge plan physically blocked",
    why: "With osteoporosis, a failed doorway forces unsafe device abandonment or a fall at the highest-risk room in the home.",
    rec: "Widen or re-hang the door, install offset hinges, or prescribe a narrower rolling walker / wheelchair and re-measure before discharge.",
    instrument: "HSSAT · doorway clearance",
  },
  {
    severity: "critical",
    title: "Abrupt carpet-to-bare-subfloor transition with raised metal lip",
    why: "Walker wheels catch on lips and seams; Monica already fears standing.",
    rec: "Level or cover the transition; remove the metal strip or add a bevel.",
    instrument: "CDC STEADI · floors & pathways",
  },
  {
    severity: "critical",
    title: "Objects and a knocked-over stand in the primary walking path",
    why: "Ankle-height clutter is a classic walker-wheel catch during short household distances.",
    rec: "Clear a continuous 36-inch path from bed to bathroom to kitchen before Friday.",
    instrument: "CDC STEADI · clutter",
  },
  {
    severity: "high",
    title: "Electrical cord along the baseboard near the walking path",
    why: "Cords plus a wide walker in a narrow hall are a trip and entanglement hazard.",
    rec: "Reroute or tape the cord; use a cord cover if it must cross the path.",
    instrument: "CDC STEADI · cords",
  },
  {
    severity: "high",
    title: "No grab bars or wall supports along hallway or bathroom",
    why: "She transfers slowly with assistance in SNF; home has no equivalent support surface.",
    rec: "OT/DME: grab bars at toilet and tub, plus a hallway rail if structurally feasible.",
    instrument: "HSSAT · bathroom supports",
  },
  {
    severity: "moderate",
    title: "Unfinished / patched concrete flooring with debris",
    why: "Uneven texture plus deconditioning increases stumble risk even without a lip.",
    rec: "Sweep debris; add a low-pile runner that is taped, not loose.",
    instrument: "CDC STEADI · flooring",
  },
]

export const measurements = [
  { label: "Entry door width", value: "30.4 in", ok: true, note: "Clears 28 in walker" },
  { label: "Bathroom door width", value: "27.6 in", ok: false, note: "Walker 28 in — will not fit" },
  { label: "Kitchen opening", value: "33.8 in", ok: true, note: "Clears 28 in walker" },
]

export const approvalsSeed: {
  id: string
  kind: "clinical" | "operational" | "dme"
  title: string
  detail: string
  coverage?: string
}[] = [
  {
    id: "a-ot",
    kind: "clinical",
    title: "OT home-safety visit before Friday discharge",
    detail:
      "Bathroom door fails walker clearance and no grab bars are present → route to OT, due before discharge.",
  },
  {
    id: "a-sw",
    kind: "operational",
    title: "Social work: overnight coverage until doorway is remediated",
    detail:
      "Lives alone; plan as written requires walker through a 27.6 in door → SW, due 24 hours.",
  },
  {
    id: "a-hinge",
    kind: "dme",
    title: "Order: offset door hinges / door widening consult (HCPCS E1399)",
    detail:
      "Reason: bathroom doorway 27.6 in vs 28 in walker.",
    coverage:
      "Home modification / E1399 — not a standard Part B DME item; flag for OT and possible MA or waiver. Review in Medplum before send.",
  },
  {
    id: "a-bars",
    kind: "dme",
    title: "Order: grab bars, toilet and tub (HCPCS E0241 / E0246)",
    detail: "Reason: no bathroom supports observed on walkthrough.",
    coverage:
      "E0241 not covered by Original Medicare (comfort/convenience); often Medicare Advantage supplemental or state waiver — flag social work in Medplum.",
  },
]

export const coverageChecks: {
  item: string
  hcpcs: string
  medicare: string
  verdict: "covered" | "not_original_medicare" | "review"
}[] = [
  {
    item: "Replacement rolling walker (only if door cannot be widened)",
    hcpcs: "E0143",
    medicare: "Covered by Medicare Part B as DME with physician order.",
    verdict: "covered",
  },
  {
    item: "Grab bars / bathtub wall rail",
    hcpcs: "E0241",
    medicare:
      "Not covered by Original Medicare; often MA supplemental or waiver.",
    verdict: "not_original_medicare",
  },
  {
    item: "Raised toilet seat",
    hcpcs: "E0244",
    medicare: "Not covered by Original Medicare; MA supplemental often covers.",
    verdict: "not_original_medicare",
  },
  {
    item: "Bedside commode (if room-confined after failed doorway)",
    hcpcs: "E0163",
    medicare: "Covered by Medicare Part B when the patient is room-confined.",
    verdict: "covered",
  },
  {
    item: "Offset hinges / door widening",
    hcpcs: "E1399",
    medicare: "Home modification — review in Medplum; not standard Part B DME.",
    verdict: "review",
  },
]

export const fhirDrafts = [
  {
    resourceType: "Observation",
    status: "DRAFT — requires clinician review",
    code: "Home doorway width (bathroom)",
    value: "27.6 in; walker 28 in; does not clear",
  },
  {
    resourceType: "ServiceRequest",
    status: "DRAFT — requires clinician review",
    code: "Grab bars (E0241)",
    value: "Toilet and tub; STEADI bathroom supports",
    coverage:
      "Not covered by Original Medicare; often MA supplemental or state waiver.",
  },
  {
    resourceType: "ServiceRequest",
    status: "DRAFT — requires clinician review",
    code: "Folding wheeled walker (E0143) — only if doorway cannot be remediated",
    value: "28in walker does not clear 27.6in door",
    coverage: "Covered by Medicare Part B as DME with physician order.",
  },
  {
    resourceType: "Task",
    status: "DRAFT — requires clinician review",
    code: "Escalate to OT + social work",
    value: "Blocked walker-clearance obligation; owner OT / SW; due before Friday DC",
  },
]

export const familyContact = {
  name: "Maya Hilpert",
  relation: "Niece",
  device: "iPhone",
}
