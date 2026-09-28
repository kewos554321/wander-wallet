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
})
