import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => vi.fn() }))
vi.mock("@/lib/quick-expense/speech-input", () => ({ useSpeechInput: () => ({ supported: false, recording: false, transcribing: false, error: null, toggle: vi.fn() }) }))
const parseText = vi.fn()
const parseReceipt = vi.fn()
vi.mock("@/lib/quick-expense/parse", async (orig) => ({ ...(await orig<object>()), parseText: (...a: unknown[]) => parseText(...a), parseReceipt: (...a: unknown[]) => parseReceipt(...a) }))
const save = vi.fn()
vi.mock("@/lib/quick-expense/use-quick-save", () => ({ useQuickSave: () => ({ save, progress: null, canNotifyLine: false }) }))
vi.mock("@/components/v2/quick-expense/camera-step", () => ({
  CameraStep: ({ onImage, onManual }: { onImage: (f: File) => void; onManual: () => void }) => (
    <div>
      <button onClick={() => onImage(new File(["a"], "r.jpg"))}>fake-shot</button>
      <button onClick={onManual}>改用手動輸入</button>
    </div>
  ),
}))
vi.mock("@/components/location-picker", () => ({ LocationPicker: () => null }))
vi.mock("@/components/ui/image-picker", () => ({ ImagePicker: () => null }))
vi.mock("@/components/ui/currency-select", () => ({ CurrencySelect: () => null }))

import { QuickExpenseV2 } from "@/components/v2/quick-expense/quick-expense-v2"

const members = [{ id: "a", displayName: "小雨" }, { id: "b", displayName: "志明" }]
const parsed = (id: string, amount = 100) => ({ id, amount, description: `d${id}`, category: "food", currency: "TWD", payerId: "a", participantIds: ["a", "b"], selected: true })

const setup = () => {
  const p = { open: true, onOpenChange: vi.fn(), projectId: "p1", projectName: "東京", members, currentUserMemberId: "a", onSuccess: vi.fn(), currency: "TWD" }
  render(<QuickExpenseV2 {...p} />)
  return p
}
const typeAndParse = (text = "早餐 100") => {
  fireEvent.change(screen.getByLabelText("消費內容"), { target: { value: text } })
  fireEvent.click(screen.getByRole("button", { name: "AI 解析" }))
}

beforeEach(() => {
  parseText.mockReset(); parseReceipt.mockReset(); save.mockReset()
  globalThis.URL.createObjectURL = vi.fn(() => "blob:1")
})

describe("QuickExpenseV2", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<QuickExpenseV2 open={false} onOpenChange={vi.fn()} projectId="p1" projectName="" members={members} currentUserMemberId="a" onSuccess={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("parses text into the confirm step", async () => {
    parseText.mockResolvedValue([parsed("1"), parsed("2")])
    setup()
    typeAndParse()
    await screen.findByText("1 / 2")
    expect(parseText.mock.calls[0][1]).toEqual({ transcript: "早餐 100", members, currentUserMemberId: "a", defaultCurrency: "TWD" })
  })

  it("keeps the text and shows the error when parsing fails or returns nothing", async () => {
    parseText.mockRejectedValueOnce(new Error("解析失敗了"))
    setup()
    typeAndParse()
    expect(await screen.findByRole("alert")).toHaveTextContent("解析失敗了")
    expect(screen.getByLabelText("消費內容")).toHaveValue("早餐 100")
    parseText.mockResolvedValueOnce([])
    fireEvent.click(screen.getByRole("button", { name: "AI 解析" }))
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("沒有辨識到支出，請換個說法再試一次"))
  })

  it("turns a receipt photo into one item", async () => {
    parseReceipt.mockResolvedValue({ amount: 880, description: "超商", category: "shopping", date: null, confidence: 1 })
    setup()
    fireEvent.click(screen.getByRole("button", { name: /拍照或掃描收據/ }))
    fireEvent.click(screen.getByText("fake-shot"))
    await screen.findByText("1 / 1")
    expect(screen.getByLabelText("金額")).toHaveValue("880")
  })

  it("returns to input when a receipt parse fails", async () => {
    parseReceipt.mockRejectedValue(new Error("收據辨識失敗"))
    setup()
    fireEvent.click(screen.getByRole("button", { name: /拍照或掃描收據/ }))
    fireEvent.click(screen.getByText("fake-shot"))
    expect(await screen.findByRole("alert")).toHaveTextContent("收據辨識失敗")
    expect(screen.getByLabelText("消費內容")).toBeInTheDocument()
  })

  it("jumps to the first invalid item instead of saving", async () => {
    parseText.mockResolvedValue([parsed("1"), parsed("2", 0)])
    setup()
    typeAndParse()
    await screen.findByText("1 / 2")
    fireEvent.click(screen.getByRole("button", { name: "新增 2 筆" }))
    expect(await screen.findByText("2 / 2")).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("第 2 筆請輸入有效金額")
    expect(save).not.toHaveBeenCalled()
  })

  it("keeps only unsaved items after a partial failure and retries them", async () => {
    parseText.mockResolvedValue([parsed("1"), parsed("2"), parsed("3")])
    save.mockResolvedValueOnce({ savedIds: ["1"], failed: { index: 1, message: "伺服器錯誤" } })
    const p = setup()
    typeAndParse()
    await screen.findByText("1 / 3")
    fireEvent.click(screen.getByRole("button", { name: "新增 3 筆" }))
    expect(await screen.findByText("1 / 2")).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("伺服器錯誤")
    expect(p.onSuccess).toHaveBeenCalledTimes(1)
    expect(p.onOpenChange).not.toHaveBeenCalled()
    save.mockResolvedValueOnce({ savedIds: ["2", "3"], failed: null })
    fireEvent.click(screen.getByRole("button", { name: "新增 2 筆" }))
    await waitFor(() => expect(p.onOpenChange).toHaveBeenCalledWith(false))
    expect(save.mock.calls[1][0].map((i: { id: string }) => i.id)).toEqual(["2", "3"])
  })

  it("returns to input after deleting every item and on 重新輸入", async () => {
    parseText.mockResolvedValue([parsed("1")])
    setup()
    typeAndParse()
    await screen.findByText("1 / 1")
    fireEvent.click(screen.getByRole("button", { name: "刪除此筆" }))
    expect(await screen.findByLabelText("消費內容")).toHaveValue("早餐 100")
    fireEvent.click(screen.getByRole("button", { name: "AI 解析" }))
    await screen.findByText("1 / 1")
    fireEvent.click(screen.getByRole("button", { name: "重新輸入" }))
    expect(screen.getByLabelText("消費內容")).toHaveValue("早餐 100")
  })
})
