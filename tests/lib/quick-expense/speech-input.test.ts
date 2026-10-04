import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"

const web = { isSupported: true, isRecording: false, transcript: "", error: null as string | null, startRecording: vi.fn(), stopRecording: vi.fn(), resetTranscript: vi.fn() }
const rec = { isSupported: true, isRecording: false, error: null as string | null, audioBlob: null as Blob | null, startRecording: vi.fn(), stopRecording: vi.fn(), reset: vi.fn() }
vi.mock("@/lib/speech", () => ({ useSpeechRecognition: () => web }))
vi.mock("@/lib/media-recorder-speech", () => ({ useMediaRecorderSpeech: () => rec }))
const authFetch = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => authFetch }))

import { useSpeechInput } from "@/lib/quick-expense/speech-input"

beforeEach(() => {
  Object.assign(web, { isSupported: true, isRecording: false, transcript: "", error: null })
  Object.assign(rec, { isSupported: true, isRecording: false, error: null, audioBlob: null })
  vi.clearAllMocks()
})

describe("useSpeechInput", () => {
  it("uses web speech when supported and emits the transcript after stopping", () => {
    const onText = vi.fn()
    const h = renderHook(() => useSpeechInput({ onText }))
    act(() => h.result.current.toggle())
    expect(web.startRecording).toHaveBeenCalled()
    web.isRecording = true
    h.rerender()
    act(() => h.result.current.toggle())
    expect(web.stopRecording).toHaveBeenCalled()
    Object.assign(web, { isRecording: false, transcript: " 早餐 100 " })
    h.rerender()
    expect(onText).toHaveBeenCalledWith("早餐 100")
    expect(web.resetTranscript).toHaveBeenCalled()
  })

  it("falls back to recorder + transcribe", async () => {
    web.isSupported = false
    authFetch.mockResolvedValue({ ok: true, json: async () => ({ text: "晚餐 600" }) })
    const onText = vi.fn()
    const h = renderHook(() => useSpeechInput({ onText }))
    act(() => h.result.current.toggle())
    expect(rec.startRecording).toHaveBeenCalled()
    rec.audioBlob = new Blob(["a"])
    h.rerender()
    await waitFor(() => expect(onText).toHaveBeenCalledWith("晚餐 600"))
    expect(authFetch.mock.calls[0][0]).toBe("/api/voice/transcribe")
    expect(rec.reset).toHaveBeenCalled()
  })

  it("reports transcribe errors and unsupported state", async () => {
    web.isSupported = false
    authFetch.mockResolvedValue({ ok: false, json: async () => ({ error: "轉換失敗了" }) })
    const h = renderHook(() => useSpeechInput({ onText: vi.fn() }))
    rec.audioBlob = new Blob(["a"])
    h.rerender()
    await waitFor(() => expect(h.result.current.error).toBe("轉換失敗了"))
    rec.isSupported = false
    h.rerender()
    expect(h.result.current.supported).toBe(false)
  })
})
