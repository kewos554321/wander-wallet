import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

const speech = { supported: true, recording: false, transcribing: false, error: null as string | null, toggle: vi.fn() }
let emit: (t: string) => void = () => {}
vi.mock("@/lib/quick-expense/speech-input", () => ({
  useSpeechInput: ({ onText }: { onText: (t: string) => void }) => {
    emit = onText
    return speech
  },
}))

import { QuickInputStep } from "@/components/v2/quick-expense/quick-input-step"

let currentUnmount: (() => void) | null = null
const setup = (text = "", error: string | null = null) => {
  if (currentUnmount) currentUnmount()
  const p = { text, onTextChange: vi.fn(), onParse: vi.fn(), onCamera: vi.fn(), onClose: vi.fn(), error }
  const { unmount } = render(<QuickInputStep {...p} />)
  currentUnmount = unmount
  return p
}

describe("QuickInputStep", () => {
  afterEach(() => {
    speech.supported = true
    speech.recording = false
    speech.transcribing = false
    speech.error = null
  })
  it("disables parse for blank text", () => {
    setup("   ")
    expect(screen.getByRole("button", { name: "AI 解析" })).toBeDisabled()
  })
  it("appends example chips and speech text with a space", () => {
    const p = setup("午餐 200")
    fireEvent.click(screen.getByRole("button", { name: "早餐 100 我付" }))
    expect(p.onTextChange).toHaveBeenCalledWith("午餐 200 早餐 100 我付")
    emit("晚餐 600")
    expect(p.onTextChange).toHaveBeenLastCalledWith("午餐 200 晚餐 600")
  })
  it("parses, opens camera, shows error, toggles mic", () => {
    const p = setup("早餐 100", "解析失敗")
    fireEvent.click(screen.getByRole("button", { name: "AI 解析" }))
    expect(p.onParse).toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: /拍照或掃描收據/ }))
    expect(p.onCamera).toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("解析失敗")
    fireEvent.click(screen.getByRole("button", { name: "語音輸入" }))
    expect(speech.toggle).toHaveBeenCalled()
  })
  it("disables parse while recording and hides mic when unsupported", () => {
    speech.recording = true
    setup("早餐 100")
    expect(screen.getByRole("button", { name: "AI 解析" })).toBeDisabled()
    speech.recording = false
    speech.supported = false
    setup("早餐 100")
    expect(screen.queryByRole("button", { name: "語音輸入" })).toBeNull()
    speech.supported = true
  })
})
