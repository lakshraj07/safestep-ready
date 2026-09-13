import Combine
import Foundation

/// Phone voice session. Live: start an ElevenLabs conversational agent (ELEVENLABS_AGENT_ID) or a Vapi assistant (VAPI_ASSISTANT_ID); both use the backend /v1 as custom LLM.
/// Demo: the web app plays a fixed Riley script; this class is session plumbing.
@MainActor
final class VoiceManager: ObservableObject {
    static let shared = VoiceManager()

    @Published var isConnected = false
    @Published var isMuted = false
    @Published var lastAgentLine = ""
    @Published var connectionError = ""

    func start() async {
        isConnected = true
        lastAgentLine = "Hold the phone at walker height. I'll tell you where to stand."
    }

    func toggleMute() {
        isMuted.toggle()
    }

    func stop() async {
        isConnected = false
        isMuted = false
    }
}
