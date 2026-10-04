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
  useLiff: () => ({ user: { id: "u1", preferences: null }, updatePreferences: vi.fn() }),
}))
vi.mock("@/components/ui/currency-select", () => ({
  CurrencySelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="結算幣別" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="TWD">TWD</option>
      <option value="JPY">JPY</option>
    </select>
  ),
}))

import { ProjectSettingsV2 } from "@/components/v2/project-settings/project-settings-v2"
import { DeleteProjectSheet } from "@/components/v2/project-settings/delete-project-sheet"

// tests/setup.ts stubs ResizeObserver with a bare vi.fn() whose implementation
// is not a constructor, so Radix popper (and therefore the date-range
// popover) crashes when it opens. Use a real class so the popover can mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver

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

function mockRoutes({ profileId = "u1" }: { profileId?: string } = {}) {
  mockAuthFetch.mockImplementation((url: string, options?: { method?: string }) => {
    const method = options?.method
    if (url === "/api/projects/p1" && !method) {
      return Promise.resolve({ ok: true, json: async () => project })
    }
    if (url === "/api/users/profile") {
      return Promise.resolve({ ok: true, json: async () => ({ id: profileId }) })
    }
    if (url === "/api/exchange-rates") {
      return Promise.resolve({ ok: true, json: async () => ({ rates: { JPY: 100, TWD: 21 } }) })
    }
    if (url === "/api/projects/p1" && method === "PUT") {
      return Promise.resolve({ ok: true, json: async () => ({}) })
    }
    if (url === "/api/projects/p1" && method === "DELETE") {
      return Promise.resolve({ ok: true, json: async () => ({}) })
    }
    return Promise.resolve({ ok: false, json: async () => ({}) })
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
    expect(await screen.findByLabelText("專案名稱")).toHaveValue("京都紅葉五日遊")
  })

  it("saves the edited values via PUT and navigates back", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    const nameInput = await screen.findByLabelText("專案名稱")
    fireEvent.change(nameInput, { target: { value: "京都楓葉五日遊" } })
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))

    await waitFor(() =>
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1", expect.objectContaining({ method: "PUT" }))
    )
    const putCall = mockAuthFetch.mock.calls.find(([url, opts]) => url === "/api/projects/p1" && opts?.method === "PUT")
    const body = JSON.parse(putCall![1].body)
    expect(body.name).toBe("京都楓葉五日遊")
    expect(body.cover).toBe("icon:leaf;color:lake")
    expect(body.customRates).toEqual({ JPY: 0.21 })
    expect(body.exchangeRatePrecision).toBe(2)
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/projects/p1"))
  })

  it("blocks save with an empty name", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    const nameInput = await screen.findByLabelText("專案名稱")
    fireEvent.change(nameInput, { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("請輸入旅程名稱")
    expect(mockAuthFetch.mock.calls.some(([, opts]) => opts?.method === "PUT")).toBe(false)
  })

  it("shows the loaded custom rate for JPY", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    expect(await screen.findByLabelText("JPY 匯率")).toHaveValue("0.21")
  })

  it("hides the danger zone for a non-creator", async () => {
    mockRoutes({ profileId: "someone-else" })
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("專案名稱")
    expect(screen.queryByText("危險區域")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "刪除專案" })).not.toBeInTheDocument()
  })

  it("clears the delete confirmation text when the sheet is reopened", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    fireEvent.click(await screen.findByRole("button", { name: "刪除專案" }))
    fireEvent.change(screen.getByLabelText("輸入 delete 確認"), { target: { value: "delete" } })
    // The sheet renders after the page footer, so its 取消 is the last one.
    fireEvent.click(screen.getAllByRole("button", { name: "取消" }).at(-1)!)
    fireEvent.click(screen.getByRole("button", { name: "刪除專案" }))
    expect(screen.getByLabelText("輸入 delete 確認")).toHaveValue("")
    expect(screen.getByRole("button", { name: "永久刪除" })).toBeDisabled()
  })

  it("lets the creator delete after confirming with delete", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    fireEvent.click(await screen.findByRole("button", { name: "刪除專案" }))

    const confirmButton = screen.getByRole("button", { name: "永久刪除" })
    expect(confirmButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText("輸入 delete 確認"), { target: { value: "delete" } })
    expect(confirmButton).not.toBeDisabled()

    fireEvent.click(confirmButton)
    await waitFor(() =>
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1", expect.objectContaining({ method: "DELETE" }))
    )
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/projects"))
  })

  it("shows the full currency label and the budget symbol", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("專案名稱")
    expect(screen.getByText("TWD 新台幣")).toBeInTheDocument()
    expect(screen.getByText("NT$")).toBeInTheDocument()
  })

  it("shows a danger counter for long descriptions but still saves them (RC3)", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    const desc = await screen.findByLabelText("描述")
    expect(screen.getByText("6/50")).toBeInTheDocument()
    const long = "x".repeat(51)
    fireEvent.change(desc, { target: { value: long } })
    expect(screen.getByText("51/50")).toHaveClass("text-v2-danger")
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    await waitFor(() =>
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1", expect.objectContaining({ method: "PUT" }))
    )
    const putCall = mockAuthFetch.mock.calls.find(([url, opts]) => url === "/api/projects/p1" && opts?.method === "PUT")
    expect(JSON.parse(putCall![1].body).description).toBe(long)
  })

  it("picks a cover through the tile sheet and saves it", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("專案名稱")
    fireEvent.click(screen.getByRole("button", { name: "更換封面" }))
    fireEvent.click(screen.getByRole("button", { name: "相機" }))
    fireEvent.click(screen.getByRole("button", { name: "顏色 ink" }))
    fireEvent.click(screen.getByRole("button", { name: "完成" }))
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    await waitFor(() =>
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1", expect.objectContaining({ method: "PUT" }))
    )
    const putCall = mockAuthFetch.mock.calls.find(([url, opts]) => url === "/api/projects/p1" && opts?.method === "PUT")
    expect(JSON.parse(putCall![1].body).cover).toBe("icon:camera;color:ink")
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
    await screen.findByLabelText("專案名稱")
    expect(screen.getAllByText("成員加入方式")).toHaveLength(1)
  })

  it("edits budget, custom rate, precision, join mode and settlement currency, then persists them", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("專案名稱")

    fireEvent.change(screen.getByLabelText("旅程預算"), { target: { value: "12345" } })
    fireEvent.change(screen.getByLabelText("JPY 匯率"), { target: { value: "0.25" } })
    fireEvent.change(screen.getByLabelText("匯率計算精度"), { target: { value: "3" } })
    fireEvent.click(screen.getByRole("radio", { name: "僅建立新成員" }))
    fireEvent.change(screen.getByLabelText("結算幣別"), { target: { value: "JPY" } })

    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    await waitFor(() =>
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1", expect.objectContaining({ method: "PUT" }))
    )
    const body = JSON.parse(putCall()![1].body)
    expect(body.budget).toBe(12345)
    expect(body.customRates).toEqual({ JPY: 0.25 })
    expect(body.exchangeRatePrecision).toBe(3)
    expect(body.joinMode).toBe("create_only")
    expect(body.currency).toBe("JPY")
  })

  it("clamps an out-of-range precision to 0", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("專案名稱")
    fireEvent.change(screen.getByLabelText("匯率計算精度"), { target: { value: "-5" } })
    expect(screen.getByLabelText("匯率計算精度")).toHaveValue(0)
  })

  it("navigates back to the project when the footer cancel is clicked", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("專案名稱")
    fireEvent.click(screen.getByRole("button", { name: "取消" }))
    expect(mockPush).toHaveBeenCalledWith("/projects/p1")
  })

  it("still renders when the exchange-rate request fails", async () => {
    mockAuthFetch.mockImplementation((url: string, options?: { method?: string }) => {
      if (url === "/api/projects/p1" && !options?.method) return Promise.resolve({ ok: true, json: async () => project })
      if (url === "/api/users/profile") return Promise.resolve({ ok: true, json: async () => ({ id: "u1" }) })
      if (url === "/api/exchange-rates") return Promise.reject(new Error("rates down"))
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    render(<ProjectSettingsV2 projectId="p1" />)
    expect(await screen.findByLabelText("專案名稱")).toHaveValue("京都紅葉五日遊")
    await waitFor(() => expect(mockAuthFetch).toHaveBeenCalledWith("/api/exchange-rates"))
    // No live-rate hint because rates never loaded.
    expect(screen.queryByText(/目前使用即時匯率/)).not.toBeInTheDocument()
  })

  it("updates the trip dates through the date-range calendar and saves them", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("專案名稱")

    fireEvent.click(screen.getByRole("button", { name: /2026\/11\/12/ }))
    // The existing range is Nov 12–16, so pick a start before it and an end after it.
    const startLabel = new Date(2026, 10, 2).toLocaleDateString()
    const endLabel = new Date(2026, 10, 25).toLocaleDateString()
    fireEvent.click(await waitFor(() => {
      const el = document.querySelector(`[data-day="${startLabel}"]`)
      if (!el) throw new Error("start day not rendered")
      return el as HTMLElement
    }))
    fireEvent.click(document.querySelector(`[data-day="${endLabel}"]`) as HTMLElement)

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
    mockAuthFetch.mockImplementation((url: string) => {
      if (url === "/api/projects/p1") return Promise.resolve({ ok: false, json: async () => ({}) })
      if (url === "/api/users/profile") return Promise.resolve({ ok: true, json: async () => ({ id: "u1" }) })
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    render(<ProjectSettingsV2 projectId="p1" />)
    expect(await screen.findByText("專案不存在")).toBeInTheDocument()
  })

  it("shows the not-found state when loading rejects", async () => {
    mockAuthFetch.mockImplementation((url: string) => {
      if (url === "/api/projects/p1") return Promise.reject(new Error("network"))
      if (url === "/api/users/profile") return Promise.resolve({ ok: true, json: async () => ({ id: "u1" }) })
      return Promise.reject(new Error("network"))
    })
    render(<ProjectSettingsV2 projectId="p1" />)
    expect(await screen.findByText("專案不存在")).toBeInTheDocument()
  })

  it("does not update after unmounting mid-load", async () => {
    let releaseProject: (value: { ok: boolean; json: () => Promise<unknown> }) => void = () => {}
    mockAuthFetch.mockImplementation((url: string) => {
      if (url === "/api/projects/p1") return new Promise((resolve) => { releaseProject = resolve })
      if (url === "/api/users/profile") return Promise.resolve({ ok: true, json: async () => ({ id: "u1" }) })
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    const { unmount } = render(<ProjectSettingsV2 projectId="p1" />)
    unmount()
    releaseProject({ ok: true, json: async () => project })
    // No assertion needed beyond not throwing; the cancelled guard must swallow the late update.
    await Promise.resolve()
  })

  it("shows the server error when saving fails", async () => {
    mockRoutes()
    mockAuthFetch.mockImplementation((url: string, options?: { method?: string }) => {
      const method = options?.method
      if (url === "/api/projects/p1" && !method) return Promise.resolve({ ok: true, json: async () => project })
      if (url === "/api/users/profile") return Promise.resolve({ ok: true, json: async () => ({ id: "u1" }) })
      if (url === "/api/exchange-rates") return Promise.resolve({ ok: true, json: async () => ({ rates: { JPY: 100, TWD: 21 } }) })
      if (url === "/api/projects/p1" && method === "PUT")
        return Promise.resolve({ ok: false, json: async () => ({ error: "名稱重複" }) })
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("專案名稱")
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("名稱重複")
    expect(mockPush).not.toHaveBeenCalledWith("/projects/p1")
  })

  it("falls back to a generic error when the save response has no body", async () => {
    mockRoutes()
    mockAuthFetch.mockImplementation((url: string, options?: { method?: string }) => {
      const method = options?.method
      if (url === "/api/projects/p1" && !method) return Promise.resolve({ ok: true, json: async () => project })
      if (url === "/api/users/profile") return Promise.resolve({ ok: true, json: async () => ({ id: "u1" }) })
      if (url === "/api/exchange-rates") return Promise.resolve({ ok: true, json: async () => ({ rates: { JPY: 100, TWD: 21 } }) })
      if (url === "/api/projects/p1" && method === "PUT")
        return Promise.resolve({ ok: false, json: () => Promise.reject(new Error("no json")) })
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("專案名稱")
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("更新失敗")
  })

  it("shows a generic error when the save request rejects", async () => {
    mockRoutes()
    mockAuthFetch.mockImplementation((url: string, options?: { method?: string }) => {
      const method = options?.method
      if (url === "/api/projects/p1" && !method) return Promise.resolve({ ok: true, json: async () => project })
      if (url === "/api/users/profile") return Promise.resolve({ ok: true, json: async () => ({ id: "u1" }) })
      if (url === "/api/exchange-rates") return Promise.resolve({ ok: true, json: async () => ({ rates: { JPY: 100, TWD: 21 } }) })
      if (url === "/api/projects/p1" && method === "PUT") return Promise.reject(new Error("network"))
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("專案名稱")
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("更新失敗")
  })

  it("shows the saving label while the PUT is in flight", async () => {
    let releasePut: (value: { ok: boolean; json: () => Promise<unknown> }) => void = () => {}
    mockAuthFetch.mockImplementation((url: string, options?: { method?: string }) => {
      const method = options?.method
      if (url === "/api/projects/p1" && !method) return Promise.resolve({ ok: true, json: async () => project })
      if (url === "/api/users/profile") return Promise.resolve({ ok: true, json: async () => ({ id: "u1" }) })
      if (url === "/api/exchange-rates") return Promise.resolve({ ok: true, json: async () => ({ rates: { JPY: 100, TWD: 21 } }) })
      if (url === "/api/projects/p1" && method === "PUT") return new Promise((resolve) => { releasePut = resolve })
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("專案名稱")
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    expect(await screen.findByRole("button", { name: "儲存中…" })).toBeDisabled()
    releasePut({ ok: true, json: async () => ({}) })
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/projects/p1"))
  })

  it("shows a delete error and keeps the creator on the page when DELETE fails", async () => {
    mockRoutes()
    mockAuthFetch.mockImplementation((url: string, options?: { method?: string }) => {
      const method = options?.method
      if (url === "/api/projects/p1" && !method) return Promise.resolve({ ok: true, json: async () => project })
      if (url === "/api/users/profile") return Promise.resolve({ ok: true, json: async () => ({ id: "u1" }) })
      if (url === "/api/exchange-rates") return Promise.resolve({ ok: true, json: async () => ({ rates: { JPY: 100, TWD: 21 } }) })
      if (url === "/api/projects/p1" && method === "DELETE") return Promise.resolve({ ok: false, json: async () => ({}) })
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    render(<ProjectSettingsV2 projectId="p1" />)
    fireEvent.click(await screen.findByRole("button", { name: "刪除專案" }))
    fireEvent.change(screen.getByLabelText("輸入 delete 確認"), { target: { value: "delete" } })
    fireEvent.click(screen.getByRole("button", { name: "永久刪除" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("刪除失敗")
    expect(mockPush).not.toHaveBeenCalledWith("/projects")
  })

  it("shows a delete error when the DELETE request rejects", async () => {
    mockRoutes()
    mockAuthFetch.mockImplementation((url: string, options?: { method?: string }) => {
      const method = options?.method
      if (url === "/api/projects/p1" && !method) return Promise.resolve({ ok: true, json: async () => project })
      if (url === "/api/users/profile") return Promise.resolve({ ok: true, json: async () => ({ id: "u1" }) })
      if (url === "/api/exchange-rates") return Promise.resolve({ ok: true, json: async () => ({ rates: { JPY: 100, TWD: 21 } }) })
      if (url === "/api/projects/p1" && method === "DELETE") return Promise.reject(new Error("network"))
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    render(<ProjectSettingsV2 projectId="p1" />)
    fireEvent.click(await screen.findByRole("button", { name: "刪除專案" }))
    fireEvent.change(screen.getByLabelText("輸入 delete 確認"), { target: { value: "delete" } })
    fireEvent.click(screen.getByRole("button", { name: "永久刪除" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("刪除失敗")
    expect(mockPush).not.toHaveBeenCalledWith("/projects")
  })

  it("renders nothing when the delete sheet is closed", () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(<DeleteProjectSheet open={false} deleting={false} error={null} onCancel={onCancel} onConfirm={onConfirm} />)
    expect(screen.queryByText("確認刪除專案")).not.toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("reflects the delete sheet's text, error and deleting states", () => {
    const { rerender } = render(<DeleteProjectSheet open deleting={false} error={null} onCancel={vi.fn()} onConfirm={vi.fn()} />)
    const input = screen.getByLabelText("輸入 delete 確認")
    expect(screen.getByRole("button", { name: "永久刪除" })).toBeDisabled()
    fireEvent.change(input, { target: { value: "delete" } })
    expect(screen.getByRole("button", { name: "永久刪除" })).not.toBeDisabled()

    rerender(<DeleteProjectSheet open deleting={false} error="刪除失敗" onCancel={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByRole("alert")).toHaveTextContent("刪除失敗")

    rerender(<DeleteProjectSheet open deleting error={null} onCancel={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByRole("button", { name: "刪除中…" })).toBeDisabled()
    expect(screen.getByLabelText("輸入 delete 確認")).toBeDisabled()
  })
})
