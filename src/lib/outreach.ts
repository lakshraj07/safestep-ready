import { patient } from "@/lib/demo-data"

const log: { at: string; to: string; body: string }[] = []

/** Fired automatically when the discharge note is handed to SafeStep. */
export function sendFamilySms() {
  const to = process.env.TWILIO_TO ?? "+1-555-0100"
  const body = `SafeStep: ${patient.name}'s care team asked you to walk the apartment (10 min). Open this link on your iPhone — Riley will guide you.`
  log.push({ at: new Date().toISOString(), to, body })
  return {
    app: "Twilio",
    action: "Messages.create",
    auto: true,
    mock: !process.env.TWILIO_AUTH_TOKEN,
    sid: `SM${log.length.toString().padStart(8, "0")}`,
    to,
    body,
  }
}

/** Riley: Vapi assistant and/or ElevenLabs custom LLM → same gathering-mode script. */
export function startRileySession() {
  const vapi = Boolean(process.env.VAPI_API_KEY)
  const eleven = Boolean(process.env.ELEVENLABS_API_KEY)
  const app = vapi ? "Vapi" : eleven ? "ElevenLabs" : "Vapi/ElevenLabs"
  return {
    app,
    action: vapi ? "assistant.start" : eleven ? "conversation.start" : "scripted.fallback",
    mock: !vapi && !eleven,
    agent: "Riley",
    mode: "gathering",
    session_id: `${vapi ? "vapi" : eleven ? "el" : "script"}-${Date.now()}`,
  }
}
