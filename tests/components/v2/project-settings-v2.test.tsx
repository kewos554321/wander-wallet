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
  useLiff: () => ({ user: { id: "u1", preferences: null }, updatePreferences: vi.fn() }),
}))
vi.mock("@/components/ui/currency-select", () => ({
  CurrencySelect: ({ value, onChange, ariaLabel }: { value: string; onChange: (v: string) => void; ariaLabel?: string }) => (
    <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="TWD">TWD</option>
      <option value="JPY">JPY</option>
      <option value="USD">USD</option>
    </select>
  ),
}))

// Capture the props DateRangeField passes to the shared Calendar and drive its
// onSelect callback directly with fixed Dates. The Calendar's day-cell markup
// (and therefore its `data-day` labels) depends on the host locale, so stubbing
// it keeps this suite deterministic under any LANG, including en_US.UTF-8.
const calendarProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }))
vi.mock("@/components/ui/calendar", () => ({
  Calendar: (props: Record<string, unknown>) => {
    calendarProps.current = props
    const onSelect = props.onSelect as (range: DateRange | undefined) => void
    return (
      <div data-testid="calendar-stub">
        <button type="button" onClick={() => onSelect({ from: new Date(2026, 10, 2) })}>
          stub-start-day
        </button>
        <button type="button" onClick={() => onSelect({ from: new Date(2026, 10, 2), to: new Date(2026, 10, 25) })}>
          stub-end-day
        </button>
      </div>
    )
  },
}))

import { ProjectSettingsV2 } from "@/components/v2/project-settings/project-settings-v2"
import { DeleteProjectSheet } from "@/components/v2/project-settings/delete-project-sheet"

function putCall() {
  return mockAuthFetch.mock.calls.find(([url, opts]) => url === "/api/projects/p1" && opts?.method === "PUT")
}

const project = {
  id: "p1",
  name: "京都紅葉五日遊",
  description: "秋天賞楓行程",
  cover: "icon:leaf;color:lake",
  budget: "50000",
  currency: "TWD",
  startDate: "2026-11-12T00:00:00.000Z",
  endDate: "2026-11-16T00:00:00.000Z",
  joinMode: "both",
  customRates: { JPY: 0.21 },
  exchangeRatePrecision: 2,
  createdBy: "u1",
  creator: { id: "u1", name: "小雨", email: "a@test.com" },
  expenses: [{ currency: "JPY" }, { currency: "TWD" }],
}

type MockResponse = { ok: boolean; json: () => Promise<unknown> }
type Pending = { pending: (resolve: (value: MockResponse) => void) => void }
type RouteResult = MockResponse | Error | Pending

const ok = (body: unknown): MockResponse => ({ ok: true, json: async () => body })
const fail = (body: unknown = {}): MockResponse => ({ ok: false, json: async () => body })
const noJson = (): MockResponse => ({ ok: false, json: () => Promise.reject(new Error("no json")) })

function respond(result: RouteResult): Promise<unknown> {
  if (result instanceof Error) return Promise.reject(result)
  if ("pending" in result) return new Promise(result.pending)
  return Promise.resolve(result)
}

// Single parameterised route table; each test only overrides the calls it cares
// about instead of re-implementing the whole fetch mock.
function mockRoutes({
  profileId = "u1",
  projectRes = ok(project),
  putRes = ok({}),
  deleteRes = ok({}),
}: {
  profileId?: string
  projectRes?: RouteResult
  putRes?: RouteResult
  deleteRes?: RouteResult
} = {}) {
  mockAuthFetch.mockImplementation((url: string, options?: { method?: string }) => {
    const method = options?.method
    if (url === "/api/projects/p1" && !method) return respond(projectRes)
    if (url === "/api/users/profile") return respond(ok({ id: profileId }))
    if (url === "/api/projects/p1" && method === "PUT") return respond(putRes)
    if (url === "/api/projects/p1" && method === "DELETE") return respond(deleteRes)
    return Promise.resolve(fail())
  })
}

describe("ProjectSettingsV2", () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockAuthFetch.mockReset()
  })

  it("loads and shows the project name", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    expect(await screen.findByLabelText("旅程名稱")).toHaveValue("京都紅葉五日遊")
  })

  it("saves the edited values via PUT and navigates back", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    const nameInput = await screen.findByLabelText("旅程名稱")
    fireEvent.change(nameInput, { target: { value: "京都楓葉五日遊" } })
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))

    await waitFor(() =>
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1", expect.objectContaining({ method: "PUT" }))
    )
    const body = JSON.parse(putCall()![1].body)
    expect(body.name).toBe("京都楓葉五日遊")
    expect(body.cover).toBe("icon:leaf;color:lake")
    expect(body).not.toHaveProperty("customRates")
    expect(body).not.toHaveProperty("exchangeRatePrecision")
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/projects/p1"))
  })

  it("blocks save with an empty name", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    const nameInput = await screen.findByLabelText("旅程名稱")
    fireEvent.change(nameInput, { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("請輸入旅程名稱")
    expect(mockAuthFetch.mock.calls.some(([, opts]) => opts?.method === "PUT")).toBe(false)
  })

  it("shows the settlement currency's minor unit", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")
    expect(screen.getByTestId("settlement-minor-unit")).toHaveTextContent("1 TWD（無小數）")
  })

  it("hides the danger zone for a non-creator", async () => {
    mockRoutes({ profileId: "someone-else" })
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")
    expect(screen.queryByText("危險區域")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "刪除旅程" })).not.toBeInTheDocument()
  })

  it("clears the delete confirmation text when the sheet is reopened", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    fireEvent.click(await screen.findByRole("button", { name: "刪除旅程" }))
    fireEvent.change(screen.getByLabelText("輸入刪除確認"), { target: { value: "刪除" } })
    // The sheet renders after the page footer, so its 取消 is the last one.
    fireEvent.click(screen.getAllByRole("button", { name: "取消" }).at(-1)!)
    fireEvent.click(screen.getByRole("button", { name: "刪除旅程" }))
    expect(screen.getByLabelText("輸入刪除確認")).toHaveValue("")
    expect(screen.getByRole("button", { name: "永久刪除" })).toBeDisabled()
  })

  it("lets the creator delete after confirming with delete", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    fireEvent.click(await screen.findByRole("button", { name: "刪除旅程" }))

    const confirmButton = screen.getByRole("button", { name: "永久刪除" })
    expect(confirmButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText("輸入刪除確認"), { target: { value: "刪除" } })
    expect(confirmButton).not.toBeDisabled()

    fireEvent.click(confirmButton)
    await waitFor(() =>
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1", expect.objectContaining({ method: "DELETE" }))
    )
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/projects"))
  })

  it("shows the full currency label and the budget prefix", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")
    expect(screen.getByText("TWD 新台幣")).toBeInTheDocument()
    expect(screen.getByLabelText("旅程預算").previousElementSibling).toHaveTextContent("TWD")
  })

  it("drops the budget help line in the compact layout", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")
    expect(screen.queryByText("設定預算後，可在旅程總覽查看花費進度")).not.toBeInTheDocument()
  })

  it("places the settlement hint and minor unit under their title", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")
    const hint = screen.getByText("所有費用將以此幣別進行結算計算")
    expect(hint.tagName).toBe("P")
    expect(screen.getByTestId("settlement-minor-unit").previousElementSibling).toBe(hint)
  })

  it("keeps the budget prefix inline with the value so they cannot overlap", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    const budget = await screen.findByLabelText("旅程預算")
    const symbol = budget.previousElementSibling as HTMLElement
    const container = budget.parentElement!
    // Flex row: the prefix is a sibling that takes its own width, so a
    // multi-char prefix (JPY/EUR/…) can never paint over the digits.
    expect(container.className).toContain("flex")
    expect(container).toContainElement(symbol)
    expect(symbol).toHaveTextContent("TWD")
    expect(budget.className).not.toContain("pl-[26px]")
  })

  it("saves a long description (no counter in the compact layout)", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    const desc = await screen.findByLabelText("描述")
    expect(screen.queryByText("6/60")).not.toBeInTheDocument()
    const long = "x".repeat(61)
    fireEvent.change(desc, { target: { value: long } })
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    await waitFor(() =>
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1", expect.objectContaining({ method: "PUT" }))
    )
    expect(JSON.parse(putCall()![1].body).description).toBe(long)
  })

  it("picks a cover through the tile sheet and saves it", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")
    fireEvent.click(screen.getByRole("button", { name: "更換封面" }))
    fireEvent.click(screen.getByRole("button", { name: "相機" }))
    fireEvent.click(screen.getByRole("button", { name: "顏色 ink" }))
    fireEvent.click(screen.getByRole("button", { name: "完成" }))
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    await waitFor(() =>
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1", expect.objectContaining({ method: "PUT" }))
    )
    expect(JSON.parse(putCall()![1].body).cover).toBe("icon:camera;color:ink")
  })

  it("uses the danger tokens for the danger zone", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByText("危險區域")
    const card = screen.getByText("危險區域").closest("div")!
    expect(card.className).toContain("bg-v2-danger-tint")
    expect(card.className).toContain("border-v2-danger-border")
  })

  it("renders the join-mode title only once in the settings variant", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")
    expect(screen.getAllByText("旅伴加入方式")).toHaveLength(1)
  })

  it("edits budget, join mode and settlement currency, then persists them", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")

    fireEvent.change(screen.getByLabelText("旅程預算"), { target: { value: "12345" } })
    fireEvent.click(screen.getByRole("radio", { name: "僅建立新旅伴" }))
    fireEvent.change(screen.getByLabelText("結算幣別"), { target: { value: "JPY" } })

    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    await waitFor(() =>
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1", expect.objectContaining({ method: "PUT" }))
    )
    const body = JSON.parse(putCall()![1].body)
    expect(body.budget).toBe(12345)
    expect(body.joinMode).toBe("create_only")
    expect(body.currency).toBe("JPY")
  })

  it("no longer shows the rate-precision field", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")
    expect(screen.queryByLabelText("匯率計算精度")).not.toBeInTheDocument()
  })

  it("navigates back to the project when the footer cancel is clicked", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")
    fireEvent.click(screen.getByRole("button", { name: "取消" }))
    expect(mockPush).toHaveBeenCalledWith("/projects/p1")
  })

  it("renders normally for a project that still has stored custom rates (Review Focus 1)", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    expect(await screen.findByLabelText("旅程名稱")).toHaveValue("京都紅葉五日遊")
    expect(screen.queryByText("固定匯率（選填）")).not.toBeInTheDocument()
    expect(mockAuthFetch).not.toHaveBeenCalledWith("/api/exchange-rates")
  })

  it("updates the trip dates through the date-range calendar and saves them", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")

    fireEvent.click(screen.getByRole("button", { name: /2026\/11\/12/ }))
    // The calendar receives the loaded Nov 12–16 range.
    expect((calendarProps.current!.selected as DateRange).from).toEqual(new Date(2026, 10, 12))
    expect((calendarProps.current!.selected as DateRange).to).toEqual(new Date(2026, 10, 16))

    // The existing range is Nov 12–16, so pick a start before it and an end after it.
    fireEvent.click(screen.getByRole("button", { name: "stub-start-day" }))
    fireEvent.click(screen.getByRole("button", { name: "stub-end-day" }))

    expect(await screen.findByText("2026/11/02 – 2026/11/25")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    await waitFor(() =>
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1", expect.objectContaining({ method: "PUT" }))
    )
    const body = JSON.parse(putCall()![1].body)
    expect(body.startDate).toBe("2026-11-02")
    expect(body.endDate).toBe("2026-11-25")
  })

  it("shows the not-found state when the project request fails", async () => {
    mockRoutes({ projectRes: fail() })
    render(<ProjectSettingsV2 projectId="p1" />)
    expect(await screen.findByText("旅程不存在")).toBeInTheDocument()
  })

  it("shows the not-found state when loading rejects", async () => {
    mockRoutes({ projectRes: new Error("network") })
    render(<ProjectSettingsV2 projectId="p1" />)
    expect(await screen.findByText("旅程不存在")).toBeInTheDocument()
  })

  it("does not update or log after unmounting mid-load", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      let releaseProject!: (value: MockResponse) => void
      mockRoutes({ projectRes: { pending: (resolve) => (releaseProject = resolve) } })
      const { unmount, container } = render(<ProjectSettingsV2 projectId="p1" />)
      unmount()
      releaseProject(ok(project))
      // Let the late load continuation run; the cancelled guard must swallow it.
      await Promise.resolve()
      await Promise.resolve()
      expect(container).toBeEmptyDOMElement()
      expect(errorSpy).not.toHaveBeenCalled()
    } finally {
      errorSpy.mockRestore()
    }
  })

  it("shows the server error when saving fails", async () => {
    mockRoutes({ putRes: fail({ error: "名稱重複" }) })
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("名稱重複")
    expect(mockPush).not.toHaveBeenCalledWith("/projects/p1")
  })

  it("falls back to a generic error when the save response has no body", async () => {
    mockRoutes({ putRes: noJson() })
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("更新失敗")
  })

  it("shows a generic error when the save request rejects", async () => {
    mockRoutes({ putRes: new Error("network") })
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("更新失敗")
  })

  it("shows the saving label while the PUT is in flight", async () => {
    let releasePut!: (value: MockResponse) => void
    mockRoutes({ putRes: { pending: (resolve) => (releasePut = resolve) } })
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    expect(await screen.findByRole("button", { name: "儲存中…" })).toBeDisabled()
    releasePut(ok({}))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/projects/p1"))
  })

  it("shows a delete error and keeps the creator on the page when DELETE fails", async () => {
    mockRoutes({ deleteRes: fail() })
    render(<ProjectSettingsV2 projectId="p1" />)
    fireEvent.click(await screen.findByRole("button", { name: "刪除旅程" }))
    fireEvent.change(screen.getByLabelText("輸入刪除確認"), { target: { value: "刪除" } })
    fireEvent.click(screen.getByRole("button", { name: "永久刪除" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("刪除失敗")
    expect(mockPush).not.toHaveBeenCalledWith("/projects")
  })

  it("shows a delete error when the DELETE request rejects", async () => {
    mockRoutes({ deleteRes: new Error("network") })
    render(<ProjectSettingsV2 projectId="p1" />)
    fireEvent.click(await screen.findByRole("button", { name: "刪除旅程" }))
    fireEvent.change(screen.getByLabelText("輸入刪除確認"), { target: { value: "刪除" } })
    fireEvent.click(screen.getByRole("button", { name: "永久刪除" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("刪除失敗")
    expect(mockPush).not.toHaveBeenCalledWith("/projects")
  })

  it("renders nothing when the delete sheet is closed", () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(<DeleteProjectSheet open={false} deleting={false} error={null} onCancel={onCancel} onConfirm={onConfirm} />)
    expect(screen.queryByText("確認刪除旅程")).not.toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("reflects the delete sheet's text, error and deleting states", () => {
    const { rerender } = render(<DeleteProjectSheet open deleting={false} error={null} onCancel={vi.fn()} onConfirm={vi.fn()} />)
    const input = screen.getByLabelText("輸入刪除確認")
    expect(screen.getByRole("button", { name: "永久刪除" })).toBeDisabled()
    fireEvent.change(input, { target: { value: "刪除" } })
    expect(screen.getByRole("button", { name: "永久刪除" })).not.toBeDisabled()

    rerender(<DeleteProjectSheet open deleting={false} error="刪除失敗" onCancel={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByRole("alert")).toHaveTextContent("刪除失敗")

    rerender(<DeleteProjectSheet open deleting error={null} onCancel={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByRole("button", { name: "刪除中…" })).toBeDisabled()
    expect(screen.getByLabelText("輸入刪除確認")).toBeDisabled()
  })

  it("shows the join-mode explainer and a visible focus ring on text fields", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")
    expect(
      screen.getByText("透過分享連結加入的人，只能建立自己的身份，或取代你建立的佔位旅伴。")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("旅程名稱").className).toContain("focus-visible:")
  })

  it("marks the invalid field inline and announces it as required", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    const name = await screen.findByLabelText("旅程名稱")
    expect(name).toHaveAttribute("aria-required", "true")

    fireEvent.change(name, { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))

    expect(name).toHaveAttribute("aria-invalid", "true")
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("請輸入旅程名稱")
    // The message lives with the field's card, not down in the fixed footer.
    expect(alert.closest("div.rounded-\\[18px\\]")).toContainElement(name)
  })

  it("gives the delete sheet dialog semantics and closes on Escape", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    fireEvent.click(await screen.findByRole("button", { name: "刪除旅程" }))

    const dialog = screen.getByRole("dialog", { name: "確認刪除旅程" })
    expect(dialog).toHaveAttribute("aria-modal", "true")

    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("dialog", { name: "確認刪除旅程" })).not.toBeInTheDocument()
  })

  it("mirrors the currency select's focus onto its visible chrome", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("旅程名稱")
    const select = screen.getByLabelText("結算幣別")
    const chrome = select.parentElement!.querySelector('[aria-hidden="true"]')
    expect(chrome?.className).toContain("group-focus-within:")
  })

  it("clears a stale submit error as soon as the field is edited", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    const name = await screen.findByLabelText("旅程名稱")
    fireEvent.change(name, { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("請輸入旅程名稱")

    fireEvent.change(name, { target: { value: "東京" } })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows every invalid field at once", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    const name = await screen.findByLabelText("旅程名稱")
    fireEvent.change(name, { target: { value: "" } })
    // A lone "." is the only non-numeric budget the input still allows through.
    fireEvent.change(screen.getByLabelText("旅程預算"), { target: { value: "." } })
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))

    const messages = (await screen.findAllByRole("alert")).map((a) => a.textContent)
    expect(messages).toEqual(expect.arrayContaining(["請輸入旅程名稱", "預算需為 0 以上的數字"]))
  })

  it("enables the delete confirm on the trimmed confirm word", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    fireEvent.click(await screen.findByRole("button", { name: "刪除旅程" }))
    const input = screen.getByLabelText("輸入刪除確認")
    expect(input).toHaveAttribute("placeholder", "刪除")
    fireEvent.change(input, { target: { value: " 刪除 " } })
    expect(screen.getByRole("button", { name: "永久刪除" })).not.toBeDisabled()
  })

  it("only accepts digits in the budget", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    const budget = await screen.findByLabelText("旅程預算")
    fireEvent.change(budget, { target: { value: "1a2b3.4.5" } })
    expect(budget).toHaveValue("123.45")
  })
})
