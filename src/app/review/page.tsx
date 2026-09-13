"use client"

import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { approvalsSeed, coverageChecks, measurements, obligations } from "@/lib/demo-data"
import { useDemo } from "@/lib/store"

export default function ReviewPage() {
  const {
    finished,
    approvals,
    approveAll,
    discharge,
    writeBack,
    writebackId,
    clearDischarge,
  } = useDemo()

  if (!finished) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Nothing to write back yet</CardTitle>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link href="/walkthrough" />}>
            Open iPhone walk (Riley)
          </Button>
        </CardContent>
      </Card>
    )
  }

  const blocked = obligations.find((o) => o.status === "blocked")

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[#141312] p-6 text-white">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bathroom door 27.1 in. Walker 28 in.
        </h1>
        <p className="mt-2 text-sm text-white/70">
          {blocked?.evidence} Drafts land in Medplum. Coverage is scored against Original
          Medicare / MA before anyone sends an order.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {measurements.map((m) => (
          <div
            key={m.label}
            className={`rounded-xl border bg-white px-4 py-3 text-sm ${
              m.ok ? "border-l-4 border-l-[#1E7A46]" : "border-l-4 border-l-[#EA2C00]"
            }`}
          >
            <b>{m.label}</b> {m.value}
            <div className="text-[#6D645A]">{m.note}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Draft actions (obligations + escalations)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {approvalsSeed.map((a) => (
            <div key={a.id} className="border-b border-[#eee6dd] pb-3 text-sm last:border-0">
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium">{a.title}</span>
                <span className="shrink-0 text-xs text-[#6D645A]">{approvals[a.id]}</span>
              </div>
              <p className="mt-1 text-[#3a342e]">{a.detail}</p>
              {a.coverage && (
                <p className="mt-1 text-xs text-[#6D645A]">Coverage: {a.coverage}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medplum · Medicare / insurance check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {coverageChecks.map((c) => (
            <div key={c.hcpcs} className="rounded-lg border border-[#eee6dd] px-3 py-2 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <b>
                  {c.item} · {c.hcpcs}
                </b>
                <span className="text-xs uppercase tracking-wide text-[#6D645A]">
                  {c.verdict.replaceAll("_", " ")}
                </span>
              </div>
              <p className="text-[#3a342e]">{c.medicare}</p>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                approveAll()
                toast.success("Approved locally — still draft in Medplum")
              }}
            >
              Approve drafts
            </Button>
            <Button
              onClick={async () => {
                await writeBack()
                toast.success("Draft bundle + coverage posted to Medplum")
              }}
            >
              {writebackId ? "Posted to Medplum EHR" : "Write back to Medplum EHR"}
            </Button>
            <Button
              variant="secondary"
              disabled={discharge !== "approved" || !writebackId}
              onClick={() => {
                clearDischarge()
                toast.success("Medplum: VERIFIED, cleared for discharge")
              }}
            >
              Clear for discharge
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
