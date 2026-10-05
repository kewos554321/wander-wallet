import { describe, it, expect, vi, beforeEach } from "vitest"
import { useState } from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"

type Store = { isSupported: boolean; isRecording: boolean; transcript: string; error: string | null }
const h = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  const store: Store = { isSupported: true, isRecording: false, transcript: "", error: null }
  const listenersRef = { listeners }
  return { store, listenersRef, emit: () => listeners.forEach((l) => l()) }
})

// A stateful fake for the Web Speech hook: it both churns identity (new object
// every render) and actually clears its transcript on reset, like the real one.
vi.mock("@/lib/speech", async () => {
  const React = await import("react")
  const { store, listenersRef, emit } = h
  return {
    useSpeechRecognition: () => {
      React.useSyncExternalStore(
        (cb: () => void) => {
          listenersRef.listeners.add(cb)
          return () => {
            listenersRef.listeners.delete(cb)
          }
        },
        () => `${store.isRecording}|${store.transcript}`,
        () => "server"
      )
      return {
        isSupported: store.isSupported,
        isRecording: store.isRecording,
        transcript: store.transcript,
        interimTranscript: "",
        error: store.error,
        startRecording: () => {
          store.isRecording = true
          store.transcript = ""
          emit()
        },
        stopRecording: () => {
          store.isRecording = false
          emit()
        },
        resetTranscript: () => {
          store.transcript = ""
          emit()
        },
      }
    },
  }
})
vi.mock("@/lib/media-recorder-speech", () => ({
  useMediaRecorderSpeech: () => ({ isSupported: false, isRecording: false, error: null, audioBlob: null, startRecording: vi.fn(), stopRecording: vi.fn(), reset: vi.fn() }),
}))
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => vi.fn() }))

import { QuickInputStep } from "@/components/v2/quick-expense/quick-input-step"

function Harness() {
  const [text, setText] = useState("")
  return (
    <QuickInputStep
      text={text}
      onTextChange={setText}
      onParse={vi.fn()}
      onCamera={vi.fn()}
      onGallery={vi.fn()}
      onClose={vi.fn()}
      error={null}
      image={null}
      onImageRemove={vi.fn()}
      mode="text"
      onModeChange={vi.fn()}
    />
  )
}

describe("QuickInputStep speech", () => {
  beforeEach(() => {
    h.store.isSupported = true
    h.store.isRecording = false
    h.store.transcript = ""
    h.store.error = null
  })

  it("appends a spoken transcript exactly once, even with a late duplicate result", () => {
    render(<Harness />)

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "語音輸入" }))
    })
    act(() => {
      h.store.transcript = "晚餐 600"
      h.emit()
    })
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "語音輸入" }))
    })
    // Late final result repeats the same transcript after stop.
    act(() => {
      h.store.transcript = "晚餐 600"
      h.emit()
    })

    expect(screen.getByLabelText("消費內容")).toHaveValue("晚餐 600")
  })
})
