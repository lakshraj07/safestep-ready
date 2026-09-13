"use client"

import { useEffect, useMemo, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { familyContact, rooms } from "@/lib/demo-data"
import { useDemo } from "@/lib/store"

function WalkthroughInner() {
  const router = useRouter()
  const params = useSearchParams()
  const auto = params.get("auto") === "1"
  const {
    ehrPulled,
    handoffSent,
    started,
    startWalkthrough,
    roomIndex,
    roomComplete,
    completeRoom,
    nextRoom,
    finished,
    answers,
    answer,
  } = useDemo()
  const room = rooms[roomIndex]
  const [visibleEvents, setVisibleEvents] = useState(0)

  useEffect(() => {
    if (!auto || started || finished) return
    void startWalkthrough()
    // run once when landing with ?auto=1
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto])

  useEffect(() => {
    if (!started || roomComplete) return
    setVisibleEvents(0)
    const timers = room.events.map((e, i) =>
      window.setTimeout(() => setVisibleEvents(i + 1), e.t)
    )
    const done = window.setTimeout(() => completeRoom(), 2200)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(done)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, roomIndex, roomComplete])

  useEffect(() => {
    if (!started || !roomComplete) return
    if (answers[room.confirmation.id] !== undefined) return
    const t = window.setTimeout(() => answer(room.confirmation.id, true), 800)
    return () => clearTimeout(t)
  }, [started, roomComplete, room, answers, answer])

  useEffect(() => {
    if (!auto || !started || finished || !roomComplete) return
    if (answers[room.confirmation.id] === undefined) return
    const t = window.setTimeout(() => {
      if (room.id === "bathroom") {
        void fetch("/api/eval", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ room: "bathroom", doors: [{ width_m: 0.688 }] }),
        }).then(() => nextRoom())
      } else {
        nextRoom()
      }
    }, 700)
    return () => clearTimeout(t)
  }, [auto, started, finished, roomComplete, answers, room, nextRoom])

  const confirmationOpen =
    started && roomComplete && answers[room.confirmation.id] === undefined
  const pct = useMemo(
    () => Math.round(((roomIndex + (roomComplete ? 1 : 0.45)) / rooms.length) * 100),
    [roomIndex, roomComplete]
  )

  if (finished) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Walk submitted — Riley done</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Bathroom door 27.1 in. Walker 28 in. Next: Medplum records + Medicare/insurance
            coverage on every drafted order.
          </p>
          <Button onClick={() => router.push("/review")}>Open Medplum write-back</Button>
        </CardContent>
      </Card>
    )
  }

  if (!started) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Link from SMS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Twilio auto-texted this link. {familyContact.name} ({familyContact.relation}) opens
            it on her {familyContact.device}. Riley (ElevenLabs, gathering mode)
            tells her how to complete each room.
          </p>
          {!ehrPulled && <p>Pull the discharge note on the EHR tab first.</p>}
          {!handoffSent && ehrPulled && <p>SMS not sent yet. You can still start from this link.</p>}
          <Button onClick={() => startWalkthrough()}>Open camera with Riley</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-start lg:justify-center">
      <div className="w-full max-w-[360px] rounded-[2.2rem] border-[10px] border-[#141312] bg-[#141312] p-2 shadow-xl">
        <div className="mx-auto mb-2 h-5 w-24 rounded-full bg-[#2a2623]" />
        <div className="overflow-hidden rounded-[1.5rem] bg-[#FBF9F6] px-3 pb-4 pt-3">
          <div className="mb-2 flex items-center justify-between text-[11px] text-[#6D645A]">
            <span>
              {familyContact.device} · {familyContact.name}
            </span>
            <span>
              {roomIndex + 1}/{rooms.length}
            </span>
          </div>
          <p className="text-[10px] tracking-widest text-[#EA2C00] uppercase">Riley</p>
          <h1 className="text-lg font-semibold">{room.name}</h1>
          <Progress value={pct} className="my-2" />
          <p className="mb-2 text-sm">{room.prompt}</p>
          <div className="relative aspect-[9/14] overflow-hidden rounded-xl bg-[#1c1814]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#4a3f36,transparent_45%),linear-gradient(#2a2420,#14110f)]" />
            {room.detections.map((d) => (
              <div
                key={d.label}
                className="absolute rounded-sm border-2 border-[#EA2C00]"
                style={{ left: `${d.x}%`, top: `${d.y}%`, width: `${d.w}%`, height: `${d.h}%` }}
              >
                <span className="absolute -top-5 left-0 bg-[#EA2C00] px-1.5 text-[10px] text-white">
                  {d.label}
                </span>
              </div>
            ))}
            <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-2 text-xs text-white">
              {room.events[Math.max(0, visibleEvents - 1)]?.text ?? "Hold the phone at walker height"}
            </div>
          </div>
          {confirmationOpen && (
            <p className="mt-2 text-xs text-[#6D645A]">{room.confirmation.question}</p>
          )}
          {roomComplete && answers[room.confirmation.id] !== undefined && (
            <Button
              className="mt-3 w-full"
              onClick={async () => {
                if (room.id === "bathroom") {
                  await fetch("/api/eval", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      room: "bathroom",
                      doors: [{ width_m: 0.688 }],
                    }),
                  })
                }
                nextRoom()
              }}
            >
              {roomIndex === rooms.length - 1 ? "Send to care team" : "Next"}
            </Button>
          )}
        </div>
      </div>
      <ul className="w-full max-w-sm space-y-2 text-sm">
        <li className="text-xs tracking-widest text-[#6D645A] uppercase">
          Riley · gathering mode (ElevenLabs)
        </li>
        {room.events.slice(0, visibleEvents).map((e) => (
          <li key={e.text} className="rounded-lg border border-[#eee6dd] bg-white px-3 py-2">
            {e.text}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function WalkthroughPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#6D645A]">Loading phone…</p>}>
      <WalkthroughInner />
    </Suspense>
  )
}
