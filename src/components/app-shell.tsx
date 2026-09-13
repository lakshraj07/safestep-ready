"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { cn } from "cn"
import { useDemo } from "@/lib/store"

const links = [
  { href: "/", label: "Medplum" },
  { href: "/walkthrough", label: "iPhone" },
  { href: "/review", label: "Coverage" },
]

function planLabel(d: string, finished: boolean) {
  if (d === "cleared") return "cleared for discharge"
  if (d === "approved") return "approved — write back to Medplum"
  if (finished) return "home check in — plan blocked"
  if (d === "handoff") return "family SMS sent"
  if (d === "ehr") return "note pulled from Medplum"
  return "waiting on EHR"
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { discharge, finished, reset } = useDemo()

  return (
    <div className="min-h-dvh bg-[#FBF9F6] text-[#141312]">
      <header className="sticky top-0 z-40 border-b border-[#e8dfd6] bg-[#141312] text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <ShieldCheck className="size-5 text-[#EA2C00]" />
            SafeStep
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-white/70 hover:bg-white/10 hover:text-white",
                  pathname === l.href && "bg-white/15 text-white"
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2 text-xs text-[#6D645A]">
        <b className="font-medium text-[#141312]">{planLabel(discharge, finished)}</b>
        <button type="button" onClick={reset} className="underline underline-offset-2">
          Reset
        </button>
      </div>
      <main className="mx-auto max-w-5xl px-4 pb-16">{children}</main>
    </div>
  )
}
