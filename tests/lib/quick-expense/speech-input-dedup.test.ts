import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"

// `web` is mutated by the fake resetTranscript so the hook sees a transcript
// that is genuinely cleared, and spread on every call so its identity churns
// exactly like the real `useSpeechRecognition` return value.
const { web } = vi.hoisted(() => ({
  web: {
    isSupported: true,
    isRecording: false,
    transcript: "",
    error: null as string | null,
    resetTranscript: vi.fn(),
  },
}))

vi.mock("@/lib/speech", () => ({
  useSpeechRecognition: () => ({
    ...web,
    resetTranscript: () => {
      web.transcript = ""
      web.resetTranscript()
    },
  }),
}))
vi.mock("@/lib/media-recorder-speech", () => ({
  useMediaRecorderSpeech: () => ({ isSupported: false, isRecording: false, error: null, audioBlob: null, startRecording: vi.fn(), stopRecording: vi.fn(), reset: vi.fn() }),
}))
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => vi.fn() }))

import { useSpeechInput } from "@/lib/quick-expense/speech-input"

describe("useSpeechInput transcript dedup", () => {
  it("emits a finished transcript once even if a late result repeats it", () => {
    web.isRecording = false
    web.transcript = ""
    web.resetTranscript.mockClear()
    const onText = vi.fn()
    const h = renderHook(() => useSpeechInput({ onText }))

    web.isRecording = true
    h.rerender()

    web.isRecording = false
    web.transcript = "晚餐 600"
    h.rerender()
    expect(onText).toHaveBeenCalledTimes(1)

    // A late final result repeats the same transcript after it was consumed.
    web.transcript = "晚餐 600"
    h.rerender()
    expect(onText).toHaveBeenCalledTimes(1)
  })

  it("stays consumed across a spurious isRecording flicker until the mic is used again", () => {
    web.isRecording = false
    web.transcript = ""
    web.resetTranscript.mockClear()
    const onText = vi.fn()
    const h = renderHook(() => useSpeechInput({ onText }))

    web.isRecording = true
    h.rerender()
    web.isRecording = false
    web.transcript = "晚餐 600"
    h.rerender()
    expect(onText).toHaveBeenCalledTimes(1)

    // Android Chrome can report a spurious start/stop around one utterance.
    web.isRecording = true
    h.rerender()
    web.isRecording = false
    web.transcript = "晚餐 600"
    h.rerender()

    expect(onText).toHaveBeenCalledTimes(1)
  })
})
