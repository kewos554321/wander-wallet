import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import type { DateRange } from "react-day-picker"

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

// Capture the props DateRangeField passes to the shared Calendar and drive its
// onSelect directly with fixed dates. This keeps the range-preview assertions
// deterministic and independent of the host locale / calendar grid layout
// (the real Calendar renders locale-dependent `data-day` values).
const calendarProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }))

vi.mock("@/components/ui/calendar", () => ({
  Calendar: (props: Record<string, unknown>) => {
    calendarProps.current = props
    const onSelect = props.onSelect as (range: DateRange | undefined) => void
    return (
      <div data-testid="calendar-stub">
        <button
          type="button"
          onClick={() => onSelect({ from: new Date(2026, 10, 12), to: new Date(2026, 10, 16) })}
        >
          stub-full-range
        </button>
        <button type="button" onClick={() => onSelect({ from: new Date(2026, 10, 12) })}>
          stub-from-only
        </button>
      </div>
    )
  },
}))

import { NewProjectV2 } from "@/components/v2/new-project/new-project-v2"

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
    expect(screen.getByLabelText("預算").previousElementSibling).toHaveTextContent("JPY")
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

  it("updates the preview, trigger and calendar while picking a date range", () => {
    render(<NewProjectV2 />)
    fireEvent.click(screen.getByRole("button", { name: "選擇日期" }))
    expect(calendarProps.current).not.toBeNull()

    // A start-only selection previews the single date and an open-ended trigger.
    fireEvent.click(screen.getByRole("button", { name: "stub-from-only" }))
    expect(screen.getByText("2026/11/12 – 2026/11/12 · 尚未邀請旅伴")).toBeInTheDocument()
    expect(screen.getByText("— 天")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "2026/11/12 – ..." })).toBeInTheDocument()

    // Completing the range updates the preview, the day count and the trigger.
    fireEvent.click(screen.getByRole("button", { name: "stub-full-range" }))
    expect(screen.getByText("2026/11/12 – 2026/11/16 · 尚未邀請旅伴")).toBeInTheDocument()
    expect(screen.getByText("5 天")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "2026/11/12 – 2026/11/16" })).toBeInTheDocument()
    expect(screen.queryByText("選擇日期")).not.toBeInTheDocument()

    // The chosen range is fed back to the Calendar in range mode.
    expect(calendarProps.current!.mode).toBe("range")
    const selected = calendarProps.current!.selected as DateRange
    expect(selected.from).toEqual(new Date(2026, 10, 12))
    expect(selected.to).toEqual(new Date(2026, 10, 16))
    expect(calendarProps.current!.defaultMonth).toEqual(new Date(2026, 10, 12))
  })

  it("sends the description and changed currency in the create payload", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "new-id" }) })
    render(<NewProjectV2 />)
    fireEvent.change(screen.getByLabelText("旅程名稱"), { target: { value: "京都" } })
    fireEvent.change(screen.getByLabelText("描述"), { target: { value: "賞楓五日" } })
    fireEvent.change(screen.getByLabelText("結算幣別"), { target: { value: "TWD" } })

    expect(screen.getByText("TWD 台幣")).toBeInTheDocument()
    // Budget prefix is the currency code; scoped to the field because the
    // currency select also renders a "TWD" option.
    expect(screen.getByLabelText("預算").previousElementSibling).toHaveTextContent("TWD")

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
