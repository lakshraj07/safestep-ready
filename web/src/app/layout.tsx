import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { DemoProvider } from "@/lib/store"
import { AppShell } from "@/components/app-shell"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "SafeStep Ready — verify the home before discharge",
  description:
    "Medplum chart in. Twilio auto-texts the iPhone link. ElevenLabs (Riley) guides the walk. Draft FHIR and Medicare coverage back to Medplum.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DemoProvider>
          <AppShell>{children}</AppShell>
        </DemoProvider>
        <Toaster />
      </body>
    </html>
  )
}
