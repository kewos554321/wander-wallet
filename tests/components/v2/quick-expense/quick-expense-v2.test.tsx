import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest"
import { StrictMode } from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"

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
let canNotifyLine = false
vi.mock("@/lib/quick-expense/use-quick-save", () => ({ useQuickSave: () => ({ save, progress: null, canNotifyLine }) }))
// Rate resolution is covered by the QuickItemCard unit tests; stub it here so
// the flow test never hits the network.
const cc = { exchangeRates: null as Record<string, number> | null, refetch: vi.fn() }
vi.mock("@/lib/hooks/useCurrencyConversion", () => ({
  useCurrencyConversion: () => ({
    convert: (a: number) => a,
    getRate: () => 1,
    exchangeRates: cc.exchangeRates,
    loading: false,
    usingFallback: false,
    ratesTimestamp: null,
    refetch: cc.refetch,
  }),
}))
const getCurrentLocation = vi.fn()
vi.mock("@/lib/geolocation", () => ({ getCurrentLocation: (...a: unknown[]) => getCurrentLocation(...a) }))
vi.mock("@/components/v2/quick-expense/camera-step", () => ({
  CameraStep: ({ onImage, onClose }: { onImage: (f: File) => void; onClose: () => void }) => (
    <div>
      <button onClick={() => onImage(new File(["a"], "r.jpg"))}>fake-shot</button>
      <button onClick={onClose}>關閉相機</button>
    </div>
  ),
}))
vi.mock("@/components/v2/expense-form/location-picker-v2", () => ({
  LocationPickerV2: ({
    value,
    onChange,
  }: {
    value: { location: string | null }
    onChange: (v: { location: string | null; latitude: number | null; longitude: number | null }) => void
  }) => (
    <button type="button" aria-label="地點" onClick={() => onChange({ location: "手動選的地點", latitude: 1, longitude: 2 })}>
      {value.location ?? "無地點"}
    </button>
  ),
}))
vi.mock("@/components/v2/expense-form/v2-image-picker", () => ({ V2ImagePicker: () => null }))
vi.mock("@/components/ui/currency-select", () => ({ CurrencySelect: () => null }))

import { QuickExpenseV2 } from "@/components/v2/quick-expense/quick-expense-v2"

const members = [{ id: "a", displayName: "小雨" }, { id: "b", displayName: "志明" }]
const parsed = (id: string, amount = 100) => ({ id, amount, description: `d${id}`, category: "food", currency: "TWD", payers: [{ memberId: "a", amount }], participantIds: ["a", "b"], selected: true })

const setup = () => {
  const p = { open: true, onOpenChange: vi.fn(), projectId: "p1", projectName: "東京", members, currentUserMemberId: "a", onSuccess: vi.fn(), currency: "TWD" }
  const { rerender } = render(<QuickExpenseV2 {...p} />)
  return { ...p, rerender }
}
const typeAndParse = (text = "早餐 100") => {
  fireEvent.change(screen.getByLabelText("消費內容"), { target: { value: text } })
  fireEvent.click(screen.getByRole("button", { name: "AI 解析" }))
}

const originalCreateObjectURL = globalThis.URL.createObjectURL
const originalRevokeObjectURL = globalThis.URL.revokeObjectURL
let backMock: MockInstance

beforeEach(() => {
  parseText.mockReset(); parseReceipt.mockReset(); save.mockReset()
  cc.exchangeRates = null; cc.refetch.mockReset()
  getCurrentLocation.mockReset()
  getCurrentLocation.mockResolvedValue(null)
  canNotifyLine = false
  globalThis.URL.createObjectURL = vi.fn(() => "blob:1")
  globalThis.URL.revokeObjectURL = vi.fn()
  // jsdom can't navigate; keep the history bookkeeping inert.
  window.history.replaceState(null, "")
  backMock = vi.spyOn(window.history, "back").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  if (originalCreateObjectURL) {
    globalThis.URL.createObjectURL = originalCreateObjectURL
  } else {
    delete (globalThis.URL as { createObjectURL?: unknown }).createObjectURL
  }
  if (originalRevokeObjectURL) {
    globalThis.URL.revokeObjectURL = originalRevokeObjectURL
  } else {
    delete (globalThis.URL as { revokeObjectURL?: unknown }).revokeObjectURL
  }
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

  it("opens straight on the camera step when initialStep is camera", () => {
    render(<QuickExpenseV2 open onOpenChange={vi.fn()} projectId="p1" projectName="" members={members} currentUserMemberId="a" onSuccess={vi.fn()} initialStep="camera" />)
    expect(screen.getByText("fake-shot")).toBeInTheDocument()
    expect(screen.queryByLabelText("消費內容")).not.toBeInTheDocument()
  })

  it("returns to the input step when the camera is closed", () => {
    render(<QuickExpenseV2 open onOpenChange={vi.fn()} projectId="p1" projectName="" members={members} currentUserMemberId="a" onSuccess={vi.fn()} initialStep="camera" />)
    fireEvent.click(screen.getByText("關閉相機"))
    expect(screen.getByLabelText("消費內容")).toBeInTheDocument()
  })

  it("closes the dialog when the phone back button is pressed on the input step", () => {
    const p = setup()
    expect(window.history.state?.qe).toBe("dialog")

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }))
    })

    expect(p.onOpenChange).toHaveBeenCalledWith(false)
  })

  it("stays open under StrictMode without popping its history entry", () => {
    render(
      <StrictMode>
        <QuickExpenseV2 open onOpenChange={vi.fn()} projectId="p1" projectName="" members={members} currentUserMemberId="a" onSuccess={vi.fn()} />
      </StrictMode>
    )

    expect(screen.getByLabelText("消費內容")).toBeInTheDocument()
    expect(backMock).not.toHaveBeenCalled()
    expect(window.history.state?.qe).toBe("dialog")
  })

  it("pops its history entry when closed with the X button", () => {
    const p = setup()
    fireEvent.click(screen.getByRole("button", { name: "關閉" }))
    expect(p.onOpenChange).toHaveBeenCalledWith(false)
    expect(backMock).toHaveBeenCalled()
  })

  it("returns to the input step when the phone back button is pressed on the camera step", () => {
    const p = setup()
    fireEvent.click(screen.getByRole("button", { name: "拍照／圖片" }))
    fireEvent.click(screen.getByRole("button", { name: "拍照" }))
    expect(screen.getByText("fake-shot")).toBeInTheDocument()
    expect(window.history.state?.qe).toBe("camera")

    // Popping the camera entry lands back on the dialog entry.
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { qe: "dialog" } }))
    })

    expect(screen.queryByText("fake-shot")).toBeNull()
    expect(screen.getByRole("button", { name: "文字／語音" })).toBeInTheDocument()
    expect(p.onOpenChange).not.toHaveBeenCalled()
  })

  it("returns to the input step on back when opening straight on the camera", () => {
    render(<QuickExpenseV2 open onOpenChange={vi.fn()} projectId="p1" projectName="" members={members} currentUserMemberId="a" onSuccess={vi.fn()} initialStep="camera" />)
    expect(window.history.state?.qe).toBe("camera")

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { qe: "dialog" } }))
    })

    expect(screen.getByLabelText("消費內容")).toBeInTheDocument()
  })

  it("attaches a receipt photo and only parses it on AI 解析", async () => {
    parseReceipt.mockResolvedValue({ amount: 880, description: "超商", category: "shopping", date: null, confidence: 1 })
    setup()
    fireEvent.click(screen.getByRole("button", { name: "拍照／圖片" }))
    fireEvent.click(screen.getByRole("button", { name: "拍照" }))
    fireEvent.click(screen.getByText("fake-shot"))
    // Back on the input in image mode; parsing is deferred.
    expect(screen.queryByLabelText("消費內容")).toBeNull()
    expect(screen.getByRole("button", { name: "移除圖片" })).toBeInTheDocument()
    expect(parseReceipt).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "AI 解析" }))
    await screen.findByText("1 / 1")
    expect(parseReceipt).toHaveBeenCalled()
    expect(screen.getByLabelText("金額")).toHaveValue("880")
  })

  it("attaches a chosen gallery image and parses it on AI 解析", async () => {
    parseReceipt.mockResolvedValue({ amount: 880, description: "超商", category: "shopping", date: null, confidence: 1 })
    setup()
    fireEvent.click(screen.getByRole("button", { name: "拍照／圖片" }))
    fireEvent.click(screen.getByRole("button", { name: "選擇圖片" }))
    fireEvent.change(screen.getByTestId("quick-gallery-input"), { target: { files: [new File(["a"], "g.jpg")] } })
    expect(screen.getByRole("button", { name: "移除圖片" })).toBeInTheDocument()
    expect(parseReceipt).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "AI 解析" }))
    await screen.findByText("1 / 1")
    expect(parseReceipt).toHaveBeenCalled()
    expect(screen.getByLabelText("金額")).toHaveValue("880")
  })

  it("replaces the tiles with the image and restores them on remove", () => {
    setup()
    fireEvent.click(screen.getByRole("button", { name: "拍照／圖片" }))
    fireEvent.click(screen.getByRole("button", { name: "拍照" }))
    fireEvent.click(screen.getByText("fake-shot"))
    expect(screen.queryByRole("button", { name: "拍照" })).toBeNull()
    expect(screen.getByRole("button", { name: "移除圖片" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "移除圖片" }))
    expect(screen.getByRole("button", { name: "拍照" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "選擇圖片" })).toBeInTheDocument()
  })

  it("uses the image and ignores the text when the image tab is active", async () => {
    parseReceipt.mockResolvedValue({ amount: 880, description: "超商", category: "shopping", date: null, confidence: 1 })
    setup()
    fireEvent.change(screen.getByLabelText("消費內容"), { target: { value: "早餐 100" } })
    fireEvent.click(screen.getByRole("button", { name: "拍照／圖片" }))
    fireEvent.click(screen.getByRole("button", { name: "拍照" }))
    fireEvent.click(screen.getByText("fake-shot"))
    fireEvent.click(screen.getByRole("button", { name: "AI 解析" }))
    await screen.findByText("1 / 1")
    expect(parseReceipt).toHaveBeenCalled()
    expect(parseText).not.toHaveBeenCalled()
  })

  it("returns to input when a receipt parse fails", async () => {
    parseReceipt.mockRejectedValue(new Error("收據辨識失敗"))
    setup()
    fireEvent.click(screen.getByRole("button", { name: "拍照／圖片" }))
    fireEvent.click(screen.getByRole("button", { name: "拍照" }))
    fireEvent.click(screen.getByText("fake-shot"))
    fireEvent.click(screen.getByRole("button", { name: "AI 解析" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("收據辨識失敗")
    expect(screen.queryByLabelText("消費內容")).toBeNull()
    expect(screen.getByRole("button", { name: "移除圖片" })).toBeInTheDocument()
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

  it("clears stale confirm state after closing while a parse was mid-flight and reopening", async () => {
    parseText.mockResolvedValue([parsed("1"), parsed("2")])
    const p = setup()
    typeAndParse()
    await screen.findByText("1 / 2")
    p.rerender(<QuickExpenseV2 {...p} open={false} />)
    p.rerender(<QuickExpenseV2 {...p} open={true} />)
    expect(screen.getByLabelText("消費內容")).toHaveValue("")
  })

  it("keeps the LINE toggle off through a partial-failure retry", async () => {
    canNotifyLine = true
    parseText.mockResolvedValue([parsed("1"), parsed("2")])
    save.mockResolvedValueOnce({ savedIds: ["1"], failed: { index: 1, message: "伺服器錯誤" } })
    setup()
    typeAndParse()
    await screen.findByText("1 / 2")
    fireEvent.click(screen.getByRole("checkbox", { name: /通知 LINE 群組/ }))
    fireEvent.click(screen.getByRole("button", { name: "新增 2 筆" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("伺服器錯誤")
    save.mockResolvedValueOnce({ savedIds: ["2"], failed: null })
    fireEvent.click(screen.getByRole("button", { name: "新增 1 筆" }))
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2))
    expect(save.mock.calls[0][1]).toEqual({ notifyLine: false })
    expect(save.mock.calls[1][1]).toEqual({ notifyLine: false })
  })

  it("auto-fills every parsed item with the device location", async () => {
    parseText.mockResolvedValue([parsed("1"), parsed("2")])
    save.mockResolvedValue({ savedIds: ["1", "2"], failed: null })
    getCurrentLocation.mockResolvedValue({ location: "京都車站", latitude: 34.9, longitude: 135.7 })
    setup()
    typeAndParse()
    await screen.findByText("1 / 2")
    expect(await screen.findByText("京都車站")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "新增 2 筆" }))
    await waitFor(() => expect(save).toHaveBeenCalled())
    const savedItems = save.mock.calls[0][0] as { location: string | null; latitude: number | null }[]
    expect(savedItems.map((item) => item.location)).toEqual(["京都車站", "京都車站"])
    expect(savedItems[0].latitude).toBe(34.9)
  })

  it("fills only items without a location, keeping the user's pick", async () => {
    parseText.mockResolvedValue([parsed("1"), parsed("2")])
    save.mockResolvedValue({ savedIds: ["1", "2"], failed: null })
    let resolveGeo: (v: { location: string; latitude: number; longitude: number }) => void = () => {}
    getCurrentLocation.mockReturnValue(
      new Promise((resolve) => {
        resolveGeo = resolve
      })
    )
    setup()
    typeAndParse()
    await screen.findByText("1 / 2")
    // The user picks a location for the visible item before the device fix lands.
    fireEvent.click(screen.getByRole("button", { name: "地點" }))
    expect(screen.getByText("手動選的地點")).toBeInTheDocument()

    await act(async () => {
      resolveGeo({ location: "京都車站", latitude: 34.9, longitude: 135.7 })
    })

    fireEvent.click(screen.getByRole("button", { name: "新增 2 筆" }))
    await waitFor(() => expect(save).toHaveBeenCalled())
    const savedItems = save.mock.calls[0][0] as { location: string | null }[]
    expect(savedItems.map((item) => item.location)).toEqual(["手動選的地點", "京都車站"])
  })

  it("ignores a failed device-location lookup", async () => {
    parseText.mockResolvedValue([parsed("1")])
    getCurrentLocation.mockResolvedValue(null)
    setup()
    typeAndParse()
    await screen.findByText("1 / 1")
    await waitFor(() => expect(getCurrentLocation).toHaveBeenCalled())
    expect(screen.getByText("無地點")).toBeInTheDocument()
  })
})
