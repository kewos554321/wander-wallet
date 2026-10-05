import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useState } from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"

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
const setup = (text = "", error: string | null = null, image: string | null = null, mode: "text" | "image" = "text") => {
  if (currentUnmount) currentUnmount()
  const p = {
    text,
    onTextChange: vi.fn(),
    onParse: vi.fn(),
    onCamera: vi.fn(),
    onGallery: vi.fn(),
    onClose: vi.fn(),
    error,
    image,
    onImageRemove: vi.fn(),
    mode,
    onModeChange: vi.fn(),
  }
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

  it("does not append the same speech phrase twice in a row", () => {
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
    render(<Harness />)
    act(() => speechRef.emit!("晚餐 600"))
    act(() => speechRef.emit!("晚餐 600"))
    expect(screen.getByLabelText("消費內容")).toHaveValue("晚餐 600")
  })

  it("shows the two-mode switch and reports a tab change", () => {
    const p = setup("")
    expect(screen.getByRole("button", { name: "文字／語音" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "拍照／圖片" })).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(screen.getByRole("button", { name: "拍照／圖片" }))
    expect(p.onModeChange).toHaveBeenCalledWith("image")
  })

  it("separates the header with a bottom border like other v2 screens", () => {
    setup("")
    expect(screen.getByText("AI 快速記帳").parentElement?.className).toContain("border-b")
  })

  it("clears all text from the text section", () => {
    const p = setup("早餐 100")
    fireEvent.click(screen.getByRole("button", { name: "清除文字" }))
    expect(p.onTextChange).toHaveBeenCalledWith("")
  })

  it("hides the clear button when there is no text", () => {
    setup("")
    expect(screen.queryByRole("button", { name: "清除文字" })).toBeNull()
  })

  it("shows only the text controls in text mode", () => {
    setup("早餐 100")
    expect(screen.getByLabelText("消費內容")).toBeInTheDocument()
    expect(screen.getByText("說出或輸入消費內容")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "拍照" })).toBeNull()
    expect(screen.queryByText("收據/消費圖片")).toBeNull()
  })

  it("puts an icon-only send control inside the text section", () => {
    setup("早餐 100")
    const send = screen.getByRole("button", { name: "AI 解析" })
    expect(send).toHaveTextContent("")
    expect(screen.getByLabelText("消費內容").closest("div")).toContainElement(send)
  })

  it("puts the send control inside the image section, disabled until an image is attached", () => {
    setup("", null, null, "image")
    const send = screen.getByRole("button", { name: "AI 解析" })
    expect(screen.getByText("收據/消費圖片").closest("div")).toContainElement(send)
    expect(send).toBeDisabled()
  })

  it("shows only the image controls in image mode", () => {
    setup("", null, null, "image")
    expect(screen.queryByLabelText("消費內容")).toBeNull()
    expect(screen.queryByRole("button", { name: "早餐 100 我付" })).toBeNull()
    expect(screen.getByText("收據/消費圖片")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "拍照" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "選擇圖片" })).toBeInTheDocument()
    expect(screen.getByText("AI 自動辨識金額與品項")).toBeInTheDocument()
  })

  it("shows the attached image with a remove button instead of the tiles", () => {
    const p = setup("", null, "blob:preview", "image")
    expect(screen.getByAltText("圖片預覽")).toHaveAttribute("src", "blob:preview")
    const title = screen.getByText("收據/消費圖片")
    const helper = screen.getByText(/只會辨識這張圖片/)
    expect(title.compareDocumentPosition(helper) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole("button", { name: "拍照" })).toBeNull()
    expect(screen.queryByRole("button", { name: "選擇圖片" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "移除圖片" }))
    expect(p.onImageRemove).toHaveBeenCalled()
  })

  it("parses, shows the error and toggles the mic in text mode", () => {
    const p = setup("早餐 100", "解析失敗")
    fireEvent.click(screen.getByRole("button", { name: "AI 解析" }))
    expect(p.onParse).toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("解析失敗")
    fireEvent.click(screen.getByRole("button", { name: "語音輸入" }))
    expect(speech.toggle).toHaveBeenCalled()
  })

  it("opens the camera and gallery from the image tab", () => {
    const p = setup("", null, null, "image")
    fireEvent.click(screen.getByRole("button", { name: "拍照" }))
    expect(p.onCamera).toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "選擇圖片" }))
    expect(p.onGallery).toHaveBeenCalled()
  })

  it("enables parse when the image tab has an image even with no text", () => {
    setup("", null, "blob:preview", "image")
    expect(screen.getByRole("button", { name: "AI 解析" })).toBeEnabled()
  })

  it("shows the refreshed examples and the placeholder in text mode", () => {
    setup("")
    expect(screen.getByRole("button", { name: "超市 1280 我付 800、小明 480" })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/我付 800 小明 480/)).toBeInTheDocument()
    expect(screen.getByText(/點麥克風可語音輸入/)).toBeInTheDocument()
  })

  it("keeps the example chips scrollable without a visible scrollbar", () => {
    setup("")
    const scroller = screen.getByRole("button", { name: "早餐 100 我付" }).parentElement
    expect(scroller?.className).toContain("overflow-x-auto")
    expect(scroller?.className).toContain("[scrollbar-width:none]")
    expect(scroller?.className).toContain("[&::-webkit-scrollbar]:hidden")
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
