import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { NotesV2View } from "@/components/v2/notes/notes-v2-view"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

const mockAuthFetch = vi.hoisted(() => vi.fn())
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
  useLiff: () => ({ user: { id: "u1" } }),
}))

import { NotesV2 } from "@/components/v2/notes/notes-v2"

function renderView(overrides: Partial<Parameters<typeof NotesV2View>[0]> = {}) {
  const props: Parameters<typeof NotesV2View>[0] = {
    projectId: "p1",
    memo: "",
    onMemo: vi.fn(),
    loading: false,
    saving: false,
    saved: false,
    hasChanges: false,
    onSave: vi.fn(),
    ...overrides,
  }
  render(<NotesV2View {...props} />)
  return props
}

describe("NotesV2View", () => {
  it("renders the heading, banner and placeholder", () => {
    renderView()
    expect(screen.getByRole("heading", { name: "筆記" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/projects/p1")
    expect(screen.getByText("所有成員共享的筆記，可記錄行程、重要資訊等")).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/在這裡輸入筆記內容/)).toBeInTheDocument()
  })

  it("calls onSave when there are changes", () => {
    const props = renderView({ hasChanges: true, memo: "x" })
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    expect(props.onSave).toHaveBeenCalled()
  })

  it("disables save without changes", () => {
    renderView({ hasChanges: false })
    expect(screen.getByRole("button", { name: "儲存變更" })).toBeDisabled()
  })

  it("pins the save button to the bottom of the page", () => {
    renderView({ hasChanges: true })
    const footer = screen.getByRole("button", { name: "儲存變更" }).closest("div.fixed")
    expect(footer).not.toBeNull()
    expect(footer).toHaveClass("inset-x-0", "bottom-0")
  })

  it("shows 已儲存 when saved", () => {
    renderView({ saved: true })
    expect(screen.getByRole("button", { name: /已儲存/ })).toBeInTheDocument()
  })

  it("reports textarea edits", () => {
    const props = renderView({ memo: "" })
    fireEvent.change(screen.getByPlaceholderText(/在這裡輸入筆記內容/), { target: { value: "航班" } })
    expect(props.onMemo).toHaveBeenCalledWith("航班")
  })

  it("renders an empty textarea and disabled save for an empty memo (Review Focus 6)", () => {
    renderView({ memo: "", hasChanges: false })
    expect(screen.getByPlaceholderText(/在這裡輸入筆記內容/)).toHaveValue("")
    expect(screen.getByRole("button", { name: "儲存變更" })).toBeDisabled()
  })
})

describe("NotesV2 container", () => {
  beforeEach(() => mockAuthFetch.mockReset())

  it("loads the memo", async () => {
    mockAuthFetch.mockResolvedValue({ ok: true, json: async () => ({ memo: "hi" }) })
    render(<NotesV2 projectId="p1" />)
    await waitFor(() => expect(screen.getByPlaceholderText(/在這裡輸入筆記內容/)).toHaveValue("hi"))
  })

  it("saves via PUT", async () => {
    mockAuthFetch.mockResolvedValue({ ok: true, json: async () => ({ memo: "hi" }) })
    render(<NotesV2 projectId="p1" />)
    const area = await screen.findByPlaceholderText(/在這裡輸入筆記內容/)
    await waitFor(() => expect(area).toHaveValue("hi"))
    fireEvent.change(area, { target: { value: "bye" } })
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    await waitFor(() =>
      expect(mockAuthFetch).toHaveBeenCalledWith(
        "/api/projects/p1/memo",
        expect.objectContaining({ method: "PUT" })
      )
    )
  })
})
