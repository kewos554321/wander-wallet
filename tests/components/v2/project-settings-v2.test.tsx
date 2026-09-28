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
})
