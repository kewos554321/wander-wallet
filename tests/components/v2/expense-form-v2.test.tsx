import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))
const mockAuthFetch = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
  useLiff: () => ({ user: { id: "u1", preferences: null }, isDevMode: false, canSendMessages: false }),
}))
vi.mock("@/lib/hooks", async (orig) => ({
  ...(await orig()),
  useProjectData: () => ({
    project: { id: "p1", name: "東京", currency: "TWD" },
    members: [
      { id: "a", displayName: "小雨", userId: "u1", user: { id: "u1" } },
      { id: "b", displayName: "志明", userId: null, user: null },
    ],
    loading: false,
    projectCurrency: "TWD",
  }),
}))
const mockSave = vi.fn()
const mockRemove = vi.fn()
vi.mock("@/lib/hooks/useSaveExpense", () => ({
  useSaveExpense: () => ({ save: mockSave, remove: mockRemove, saving: false, uploadingImage: false, deleting: false, canNotifyLine: false }),
}))
vi.mock("@/components/location-picker", () => ({ LocationPicker: () => null }))
vi.mock("@/components/ui/image-picker", () => ({ ImagePicker: () => null }))
vi.mock("@/components/ui/calculator", () => ({ Calculator: () => null }))

import { ExpenseFormV2 } from "@/components/v2/expense-form/expense-form-v2"

describe("ExpenseFormV2", () => {
  beforeEach(() => {
    mockSave.mockReset().mockResolvedValue({ ok: true })
    mockRemove.mockReset().mockResolvedValue({ ok: true })
    mockPush.mockReset()
    mockAuthFetch.mockReset()
  })

  it("creates with the current user as payer and an equal split", async () => {
    render(<ExpenseFormV2 projectId="p1" mode="create" />)
    fireEvent.change(await screen.findByLabelText("金額"), { target: { value: "100" } })
    fireEvent.click(screen.getByRole("button", { name: "新增支出 · TWD 100" }))
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    const req = mockSave.mock.calls[0][0]
    expect(req.mode).toBe("create")
    expect(req.payload.paidByMemberId).toBe("a")
    expect(req.payload.participants).toEqual([
      { memberId: "a", shareAmount: 50 },
      { memberId: "b", shareAmount: 50 },
    ])
    expect(req.payload.splitDetail).toBeNull()
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/projects/p1/expenses"))
  })

  it("shows the save error and stays", async () => {
    mockSave.mockResolvedValueOnce({ ok: false, error: "新增失敗" })
    render(<ExpenseFormV2 projectId="p1" mode="create" />)
    fireEvent.change(await screen.findByLabelText("金額"), { target: { value: "100" } })
    fireEvent.click(screen.getByRole("button", { name: "新增支出 · TWD 100" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("新增失敗")
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("loads an expense for edit and saves with PUT data", async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "e1",
        amount: 100,
        currency: "TWD",
        description: "晚餐",
        category: "food",
        image: null,
        location: null,
        latitude: null,
        longitude: null,
        expenseDate: new Date(2026, 10, 16, 19).toISOString(),
        paidByMemberId: "b",
        payer: { id: "b", displayName: "志明" },
        participants: [
          { memberId: "a", shareAmount: 60, member: { id: "a", displayName: "小雨" } },
          { memberId: "b", shareAmount: 40, member: { id: "b", displayName: "志明" } },
        ],
        splitDetail: { version: 1, personalItems: {}, customShares: { a: 60 } },
      }),
    })
    render(<ExpenseFormV2 projectId="p1" expenseId="e1" mode="edit" />)
    expect(await screen.findByDisplayValue("晚餐")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    const req = mockSave.mock.calls[0][0]
    expect(req.mode).toBe("edit")
    expect(req.expenseId).toBe("e1")
    expect(req.payload.splitDetail).toEqual({ version: 1, personalItems: {}, customShares: { a: 60 } })
  })

  it("deletes after confirmation in edit mode", async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "e1",
        amount: 100,
        currency: "TWD",
        description: "晚餐",
        category: "food",
        image: null,
        location: null,
        latitude: null,
        longitude: null,
        expenseDate: new Date().toISOString(),
        paidByMemberId: "a",
        payer: { id: "a", displayName: "小雨" },
        participants: [{ memberId: "a", shareAmount: 100, member: { id: "a", displayName: "小雨" } }],
        splitDetail: null,
      }),
    })
    render(<ExpenseFormV2 projectId="p1" expenseId="e1" mode="edit" />)
    fireEvent.click(await screen.findByRole("button", { name: "刪除支出" }))
    fireEvent.click(await screen.findByRole("button", { name: "刪除" }))
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(expect.objectContaining({ expenseId: "e1" })))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/projects/p1/expenses"))
  })
})
