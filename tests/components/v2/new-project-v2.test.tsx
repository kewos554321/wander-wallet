import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("next/image", () => ({ default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} /> }))
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))
const mockAuthFetch = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
  useLiff: () => ({
    user: { id: "u1", preferences: { defaultCurrency: "JPY" } },
    updatePreferences: vi.fn(),
  }),
}))
vi.mock("@/components/ui/currency-select", () => ({
  CurrencySelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="結算幣別" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="TWD">TWD</option>
      <option value="JPY">JPY</option>
    </select>
  ),
}))

import { NewProjectV2 } from "@/components/v2/new-project/new-project-v2"

// tests/setup.ts stubs ResizeObserver with a bare vi.fn() whose implementation
// is not a constructor, so Radix popper crashes when the date-range popover
// opens. Provide a constructable stub so the calendar can mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver

// data-day attributes use toLocaleDateString() (e.g. "2026/10/7"); convert to
// the zero-padded yyyy/MM/dd form the v2 date display renders.
function slashDay(dayAttribute: string): string {
  const [year, month, day] = dayAttribute.split("/").map(Number)
  return `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`
}

function dayButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button[data-day]"))
}

describe("NewProjectV2", () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockAuthFetch.mockReset()
  })

  it("updates the preview as the name is typed", () => {
    render(<NewProjectV2 />)
    expect(screen.getByText("峇里島放鬆之旅")).toBeInTheDocument()
    expect(screen.getByText("— 天")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("旅程名稱"), { target: { value: "京都" } })
    expect(screen.queryByText("峇里島放鬆之旅")).not.toBeInTheDocument()
    expect(screen.getByText("京都")).toBeInTheDocument()
  })

  it("renders the section cards and the short currency label", () => {
    render(<NewProjectV2 />)
    for (const title of ["卡片預覽", "封面", "基本資訊", "描述（選填）", "成員加入方式"]) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    expect(screen.getByText("JPY 日圓")).toBeInTheDocument()
    expect(screen.getByText("¥")).toBeInTheDocument()
  })

  it("blocks submit with an empty name", () => {
    render(<NewProjectV2 />)
    fireEvent.click(screen.getByRole("button", { name: "建立旅程" }))
    expect(screen.getByRole("alert")).toHaveTextContent("請輸入旅程名稱")
    expect(mockAuthFetch).not.toHaveBeenCalled()
  })

  it("submits the create payload and navigates to the new project", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "new-id" }) })
    render(<NewProjectV2 />)
    fireEvent.change(screen.getByLabelText("旅程名稱"), { target: { value: "京都" } })
    fireEvent.change(screen.getByLabelText("預算"), { target: { value: "10000" } })
    fireEvent.click(screen.getByLabelText("僅建立新成員"))
    fireEvent.click(screen.getByRole("button", { name: "汽車" }))

    expect(screen.getByText("JPY 日圓")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "建立旅程" }))

    await waitFor(() => expect(mockAuthFetch).toHaveBeenCalled())
    const [url, options] = mockAuthFetch.mock.calls[0]
    expect(url).toBe("/api/projects")
    expect(options.method).toBe("POST")
    expect(JSON.parse(options.body)).toEqual({
      name: "京都",
      description: null,
      cover: "icon:car;color:lake",
      startDate: null,
      endDate: null,
      budget: 10000,
      currency: "JPY",
      joinMode: "create_only",
    })
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/projects/new-id"))
  })

  it("shows the server error in the alert", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "專案名稱必填" }) })
    render(<NewProjectV2 />)
    fireEvent.change(screen.getByLabelText("旅程名稱"), { target: { value: "京都" } })
    fireEvent.click(screen.getByRole("button", { name: "建立旅程" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("專案名稱必填")
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("updates the preview and trigger when a date range is picked from the calendar", () => {
    render(<NewProjectV2 />)
    fireEvent.click(screen.getByRole("button", { name: "選擇日期" }))

    const first = dayButtons()[10]
    const startLabel = slashDay(first.getAttribute("data-day")!)
    fireEvent.click(first)

    const second = dayButtons()[14]
    const endLabel = slashDay(second.getAttribute("data-day")!)
    fireEvent.click(second)

    const dayCount =
      Math.round((new Date(endLabel).getTime() - new Date(startLabel).getTime()) / 86400000) + 1
    expect(screen.getByText(`${startLabel} – ${endLabel} · 尚未邀請旅伴`)).toBeInTheDocument()
    expect(screen.getByText(`${dayCount} 天`)).toBeInTheDocument()
    // The trigger shows the same range once both ends are chosen.
    expect(screen.getByRole("button", { name: `${startLabel} – ${endLabel}` })).toBeInTheDocument()
    expect(screen.queryByText("選擇日期")).not.toBeInTheDocument()
  })

  it("sends the description and changed currency in the create payload", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "new-id" }) })
    render(<NewProjectV2 />)
    fireEvent.change(screen.getByLabelText("旅程名稱"), { target: { value: "京都" } })
    fireEvent.change(screen.getByLabelText("描述"), { target: { value: "賞楓五日" } })
    fireEvent.change(screen.getByLabelText("結算幣別"), { target: { value: "TWD" } })

    expect(screen.getByText("TWD 台幣")).toBeInTheDocument()
    expect(screen.getByText("NT$")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "建立旅程" }))
    await waitFor(() => expect(mockAuthFetch).toHaveBeenCalled())
    const body = JSON.parse(mockAuthFetch.mock.calls[0][1].body)
    expect(body.description).toBe("賞楓五日")
    expect(body.currency).toBe("TWD")
  })

  it("falls back to the generic create error when the error body is not JSON", async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error("not json")
      },
    })
    render(<NewProjectV2 />)
    fireEvent.change(screen.getByLabelText("旅程名稱"), { target: { value: "京都" } })
    fireEvent.click(screen.getByRole("button", { name: "建立旅程" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("建立失敗，請重試")
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("shows the generic create error and re-enables the button when the request rejects", async () => {
    mockAuthFetch.mockRejectedValueOnce(new Error("network"))
    render(<NewProjectV2 />)
    fireEvent.change(screen.getByLabelText("旅程名稱"), { target: { value: "京都" } })
    fireEvent.click(screen.getByRole("button", { name: "建立旅程" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("建立失敗，請重試")
    expect(mockPush).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole("button", { name: "建立旅程" })).toBeEnabled())
  })
})
