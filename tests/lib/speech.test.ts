import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

// Mock SpeechRecognition class
class MockSpeechRecognition {
  continuous = false
  interimResults = false
  lang = ""
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  onend: (() => void) | null = null
  onstart: (() => void) | null = null

  start = vi.fn(() => {
    if (this.onstart) {
      this.onstart()
    }
  })

  stop = vi.fn(() => {
    if (this.onend) {
      this.onend()
    }
  })

  abort = vi.fn()
}

// Create a singleton mock instance for tracking
let mockRecognition: MockSpeechRecognition

// Create constructor function
function createMockRecognition() {
  mockRecognition = new MockSpeechRecognition()
  return mockRecognition
}

describe("useSpeechRecognition", () => {
  beforeEach(() => {
    vi.resetModules()

    // Setup window with SpeechRecognition
    Object.defineProperty(global, "window", {
      value: {
        SpeechRecognition: createMockRecognition,
        webkitSpeechRecognition: undefined,
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("should initialize with default state when supported", async () => {
    const { useSpeechRecognition } = await import("@/lib/speech")
    const { result } = renderHook(() => useSpeechRecognition())

    expect(result.current.isSupported).toBe(true)
    expect(result.current.isRecording).toBe(false)
    expect(result.current.transcript).toBe("")
    expect(result.current.interimTranscript).toBe("")
    expect(result.current.error).toBeNull()
  })

  it("should set continuous and interimResults to true", async () => {
    const { useSpeechRecognition } = await import("@/lib/speech")
    renderHook(() => useSpeechRecognition())

    expect(mockRecognition.continuous).toBe(true)
    expect(mockRecognition.interimResults).toBe(true)
  })

  it("should set language to zh-TW", async () => {
    const { useSpeechRecognition } = await import("@/lib/speech")
    renderHook(() => useSpeechRecognition())

    expect(mockRecognition.lang).toBe("zh-TW")
  })

  it("should start recording", async () => {
    const { useSpeechRecognition } = await import("@/lib/speech")
    const { result } = renderHook(() => useSpeechRecognition())

    await act(async () => {
      result.current.startRecording()
    })

    expect(mockRecognition.start).toHaveBeenCalled()
    expect(result.current.isRecording).toBe(true)
  })

  it("should stop recording when already recording", async () => {
    const { useSpeechRecognition } = await import("@/lib/speech")
    const { result } = renderHook(() => useSpeechRecognition())

    // Start then stop
    await act(async () => {
      result.current.startRecording()
    })
    await act(async () => {
      result.current.stopRecording()
    })

    expect(mockRecognition.stop).toHaveBeenCalled()
    expect(result.current.isRecording).toBe(false)
  })

  it("should reset transcript", async () => {
    const { useSpeechRecognition } = await import("@/lib/speech")
    const { result } = renderHook(() => useSpeechRecognition())

    await act(async () => {
      result.current.resetTranscript()
    })

    expect(result.current.transcript).toBe("")
    expect(result.current.interimTranscript).toBe("")
    expect(result.current.error).toBeNull()
  })

  it("should handle final transcript results", async () => {
    const { useSpeechRecognition } = await import("@/lib/speech")
    const { result } = renderHook(() => useSpeechRecognition())

    await act(async () => {
      result.current.startRecording()
    })

    await act(async () => {
      if (mockRecognition.onresult) {
        mockRecognition.onresult({
          resultIndex: 0,
          results: {
            length: 1,
            0: { isFinal: true, 0: { transcript: "測試語音" } },
          },
        })
      }
    })

    expect(result.current.transcript).toBe("測試語音")
  })

  it("should handle interim transcript results", async () => {
    const { useSpeechRecognition } = await import("@/lib/speech")
    const { result } = renderHook(() => useSpeechRecognition())

    await act(async () => {
      result.current.startRecording()
    })

    await act(async () => {
      if (mockRecognition.onresult) {
        mockRecognition.onresult({
          resultIndex: 0,
          results: {
            length: 1,
            0: { isFinal: false, 0: { transcript: "測試中" } },
          },
        })
      }
    })

    expect(result.current.interimTranscript).toBe("測試中")
  })

  it("should handle not-allowed error", async () => {
    const { useSpeechRecognition } = await import("@/lib/speech")
    const { result } = renderHook(() => useSpeechRecognition())

    await act(async () => {
      result.current.startRecording()
    })

    await act(async () => {
      if (mockRecognition.onerror) {
        mockRecognition.onerror({ error: "not-allowed" })
      }
    })

    expect(result.current.error).toBe("請允許麥克風權限")
    expect(result.current.isRecording).toBe(false)
  })

  it("should handle no-speech error", async () => {
    const { useSpeechRecognition } = await import("@/lib/speech")
    const { result } = renderHook(() => useSpeechRecognition())

    await act(async () => {
      result.current.startRecording()
    })

    await act(async () => {
      if (mockRecognition.onerror) {
        mockRecognition.onerror({ error: "no-speech" })
      }
    })

    expect(result.current.error).toBe("沒有偵測到語音")
  })

  it("should handle network error", async () => {
    const { useSpeechRecognition } = await import("@/lib/speech")
    const { result } = renderHook(() => useSpeechRecognition())

    await act(async () => {
      result.current.startRecording()
    })

    await act(async () => {
      if (mockRecognition.onerror) {
        mockRecognition.onerror({ error: "network" })
      }
    })

    expect(result.current.error).toBe("網路錯誤，請檢查連線")
  })

  it("should handle unknown error", async () => {
    const { useSpeechRecognition } = await import("@/lib/speech")
    const { result } = renderHook(() => useSpeechRecognition())

    await act(async () => {
      result.current.startRecording()
    })

    await act(async () => {
      if (mockRecognition.onerror) {
        mockRecognition.onerror({ error: "other-error" })
      }
    })

    expect(result.current.error).toBe("語音辨識錯誤: other-error")
  })

  it("should abort on unmount", async () => {
    const { useSpeechRecognition } = await import("@/lib/speech")
    const { unmount } = renderHook(() => useSpeechRecognition())

    unmount()

    expect(mockRecognition.abort).toHaveBeenCalled()
  })

  it("should return isSupported false when no speech recognition", async () => {
    vi.resetModules()
    Object.defineProperty(global, "window", {
      value: {
        SpeechRecognition: undefined,
        webkitSpeechRecognition: undefined,
      },
      writable: true,
      configurable: true,
    })

    const { useSpeechRecognition } = await import("@/lib/speech")
    const { result } = renderHook(() => useSpeechRecognition())

    expect(result.current.isSupported).toBe(false)
  })
})
