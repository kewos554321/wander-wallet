import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

const speech = { supported: true, recording: false, transcribing: false, error: null as string | null, toggle: vi.fn() }
// `emit` is assigned while the component renders, so keep it in a hoisted ref
// that every test resets instead of relying on module-init ordering.
const speechRef = vi.hoisted(() => ({ emit: undefined as ((t: string) => void) | undefined }))
vi.mock("@/lib/quick-expense/speech-input", () => ({
  useSpeechInput: ({ onText }: { onText: (t: string) => void }) => {
    speechRef.emit = onText
    return speech
  },
}))

import { QuickInputStep } from "@/components/v2/quick-expense/quick-input-step"

let currentUnmount: (() => void) | null = null
const setup = (text = "", error: string | null = null) => {
  if (currentUnmount) currentUnmount()
  const p = { text, onTextChange: vi.fn(), onParse: vi.fn(), onCamera: vi.fn(), onGallery: vi.fn(), onClose: vi.fn(), error }
  const { unmount } = render(<QuickInputStep {...p} />)
  currentUnmount = unmount
  return p
}

describe("QuickInputStep", () => {
  beforeEach(() => {
    speechRef.emit = undefined
  })
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
    speechRef.emit!("晚餐 600")
    expect(p.onTextChange).toHaveBeenLastCalledWith("午餐 200 晚餐 600")
  })
  it("parses, opens camera, opens gallery, shows error, toggles mic", () => {
    const p = setup("早餐 100", "解析失敗")
    fireEvent.click(screen.getByRole("button", { name: "AI 解析" }))
    expect(p.onParse).toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "拍照" }))
    expect(p.onCamera).toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "選擇圖片" }))
    expect(p.onGallery).toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("解析失敗")
    fireEvent.click(screen.getByRole("button", { name: "語音輸入" }))
    expect(speech.toggle).toHaveBeenCalled()
  })
  it("shows the serif title and image-section helper copy", () => {
    setup("早餐 100")
    expect(screen.getByText("AI 快速記帳")).toBeInTheDocument()
    expect(screen.getByText("收據/消費圖片")).toBeInTheDocument()
    expect(screen.getByText("AI 自動辨識金額與品項")).toBeInTheDocument()
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
