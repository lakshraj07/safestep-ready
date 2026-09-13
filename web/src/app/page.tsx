"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { encounterNote, familyContact, handoffMessage, patient } from "@/lib/demo-data"
import { problem, solution, tech, workflow } from "@/lib/pitch"
import { useDemo } from "@/lib/store"

export default function EhrPage() {
  const router = useRouter()
  const { ehrPulled, pullEhr, handoffSent } = useDemo()

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-[#141312] p-6 text-white md:p-8">
        <p className="text-[11px] tracking-[0.14em] text-white/45 uppercase">Problem</p>
        <h1 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
          {problem}
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-white/75">{solution[0]}</p>
        <p className="mt-2 max-w-2xl text-sm text-white/75">{solution[1]}</p>
        <ol className="mt-6 grid gap-3 text-sm text-white/80 md:grid-cols-3">
          {tech.map((line, i) => (
            <li key={line} className="rounded-xl bg-white/8 px-3 py-3">
              <span className="block text-[10px] tracking-widest text-[#EA2C00] uppercase">
                {i + 1}
              </span>
              {line}
            </li>
          ))}
        </ol>
        <ol className="mt-4 grid gap-2 sm:grid-cols-4">
          {workflow.map((w) => (
            <li key={w.step} className="rounded-xl border border-white/15 px-3 py-3 text-sm">
              <span className="block text-[10px] tracking-widest text-[#EA2C00] uppercase">
                {w.step} · {w.app}
              </span>
              <span className="text-white/80">{w.does}</span>
            </li>
          ))}
        </ol>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>
            {patient.name} · {patient.age}{patient.sex} · home {patient.dischargeTarget}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[#6D645A]">
            28-inch walker · lives alone · Medplum Patient/{patient.id}
          </p>
          {!ehrPulled ? (
            <Button
              onClick={async () => {
                await pullEhr()
                toast.success("Medplum note in · Twilio auto-texted Maya the iPhone link")
              }}
            >
              Pull note (Twilio texts the link)
            </Button>
          ) : (
            <>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-[#F7F2ED] p-3 font-sans text-sm leading-relaxed">
                {encounterNote}
              </pre>
              {handoffSent && (
                <p className="rounded-xl border border-[#eee6dd] px-3 py-2 text-sm">
                  SMS to {familyContact.name}: {handoffMessage}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push("/walkthrough?auto=1")}
                >
                  Open {familyContact.name}’s iPhone — Riley (ElevenLabs) guides the walk
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
