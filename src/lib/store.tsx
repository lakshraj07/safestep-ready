"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { approvalsSeed, rooms } from "@/lib/demo-data"

export type DischargeState =
  | "idle"
  | "ehr"
  | "handoff"
  | "in_review"
  | "approved"
  | "cleared"

type ApprovalStatus = "pending" | "approved"

type DemoState = {
  ehrPulled: boolean
  handoffSent: boolean
  voiceSession: string | null
  roomIndex: number
  roomComplete: boolean
  started: boolean
  finished: boolean
  answers: Record<string, boolean>
  approvals: Record<string, ApprovalStatus>
  discharge: DischargeState
  writebackId: string | null
}

type Store = DemoState & {
  pullEhr: () => Promise<void>
  sendHandoff: () => Promise<void>
  startWalkthrough: () => Promise<void>
  completeRoom: () => void
  nextRoom: () => void
  answer: (id: string, yes: boolean) => void
  approve: (id: string) => void
  approveAll: () => void
  writeBack: () => Promise<void>
  clearDischarge: () => void
  reset: () => void
}

const KEY = "safestep-v2"

const defaults: DemoState = {
  ehrPulled: false,
  handoffSent: false,
  voiceSession: null,
  roomIndex: 0,
  roomComplete: false,
  started: false,
  finished: false,
  answers: {},
  approvals: Object.fromEntries(approvalsSeed.map((a) => [a.id, "pending" as ApprovalStatus])),
  discharge: "idle",
  writebackId: null,
}

const Ctx = createContext<Store | null>(null)

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : "{}",
  })
  return res.json()
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(defaults)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setState({ ...defaults, ...JSON.parse(raw) })
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state, hydrated])

  const api = useMemo<Store>(
    () => ({
      ...state,
      pullEhr: async () => {
        await postJson("/api/medplum/note")
        await postJson("/api/outreach", { kind: "sms" })
        setState((s) => ({
          ...s,
          ehrPulled: true,
          handoffSent: true,
          discharge: "handoff",
        }))
      },
      sendHandoff: async () => {
        await postJson("/api/outreach", { kind: "sms" })
        setState((s) => ({ ...s, handoffSent: true, discharge: "handoff" }))
      },
      startWalkthrough: async () => {
        const voice = await postJson("/api/outreach", { kind: "voice" })
        setState((s) => ({
          ...s,
          started: true,
          finished: false,
          roomIndex: 0,
          roomComplete: false,
          voiceSession: voice.session_id ?? "riley",
        }))
      },
      completeRoom: () => setState((s) => ({ ...s, roomComplete: true })),
      nextRoom: () =>
        setState((s) => {
          const last = s.roomIndex >= rooms.length - 1
          if (last) {
            return {
              ...s,
              finished: true,
              roomComplete: true,
              discharge: "in_review",
            }
          }
          return { ...s, roomIndex: s.roomIndex + 1, roomComplete: false }
        }),
      answer: (id, yes) =>
        setState((s) => ({ ...s, answers: { ...s.answers, [id]: yes } })),
      approve: (id) =>
        setState((s) => {
          const approvals: Record<string, ApprovalStatus> = { ...s.approvals, [id]: "approved" }
          const all = Object.values(approvals).every((v) => v === "approved")
          return { ...s, approvals, discharge: all ? "approved" : s.discharge }
        }),
      approveAll: () =>
        setState((s) => ({
          ...s,
          approvals: Object.fromEntries(
            Object.keys(s.approvals).map((k) => [k, "approved" as const])
          ),
          discharge: "approved",
        })),
      writeBack: async () => {
        const r = await postJson("/api/medplum/writeback")
        setState((s) => ({ ...s, writebackId: r.id ?? "wb" }))
      },
      clearDischarge: () => setState((s) => ({ ...s, discharge: "cleared" })),
      reset: () => setState(defaults),
    }),
    [state]
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useDemo() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useDemo must be used within DemoProvider")
  return v
}
