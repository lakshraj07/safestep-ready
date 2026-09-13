import Combine
import Foundation

/// Phone voice session. Live: start a Vapi assistant with VAPI_API_KEY + VAPI_ASSISTANT_ID.
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
