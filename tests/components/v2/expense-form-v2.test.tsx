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
// Renders the current location so tests can observe the shared geolocation
// helper's result being applied to the draft (the real picker is a full UI
// widget we don't need here).
vi.mock("@/components/v2/expense-form/location-picker-v2", () => ({
  LocationPickerV2: ({ value }: { value: { location: string | null } }) => (
    <span data-testid="location">{value?.location ?? ""}</span>
  ),
}))
vi.mock("@/components/v2/expense-form/v2-image-picker", () => ({ V2ImagePicker: () => null }))
const mockGetCurrentLocation = vi.fn()
vi.mock("@/lib/geolocation", () => ({ getCurrentLocation: () => mockGetCurrentLocation() }))

import { ExpenseFormV2 } from "@/components/v2/expense-form/expense-form-v2"

describe("ExpenseFormV2", () => {
  beforeEach(() => {
    mockSave.mockReset().mockResolvedValue({ ok: true })
    mockRemove.mockReset().mockResolvedValue({ ok: true })
    mockPush.mockReset()
    mockAuthFetch.mockReset()
    mockGetCurrentLocation.mockReset().mockResolvedValue(null)
  })

  it("creates with the current user as the sole payer and participant", async () => {
    render(<ExpenseFormV2 projectId="p1" mode="create" />)
    fireEvent.change(await screen.findByLabelText("金額"), { target: { value: "100" } })
    fireEvent.click(screen.getByRole("button", { name: "新增支出 · TWD 100" }))
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    const req = mockSave.mock.calls[0][0]
    expect(req.mode).toBe("create")
    expect(req.payload.payers).toEqual([{ memberId: "a", amount: 100 }])
    // A new expense starts with only the current user sharing it; co-splitters
    // are added explicitly.
    expect(req.payload.participants).toEqual([{ memberId: "a", shareAmount: 100 }])
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
        payers: [{ memberId: "b", amount: 100, member: { id: "b", displayName: "志明" } }],
        participants: [
          { memberId: "a", shareAmount: 60, member: { id: "a", displayName: "小雨" } },
          { memberId: "b", shareAmount: 40, member: { id: "b", displayName: "志明" } },
        ],
        splitDetail: { version: 1, personalItems: {}, customShares: { a: 60 } },
      }),
    })
    render(<ExpenseFormV2 projectId="p1" expenseId="e1" mode="edit" />)
    expect(await screen.findByDisplayValue("晚餐")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "儲存變更 · TWD 100" }))
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    const req = mockSave.mock.calls[0][0]
    expect(req.mode).toBe("edit")
    expect(req.expenseId).toBe("e1")
    expect(req.payload.payers).toEqual([{ memberId: "b", amount: 100 }])
    expect(req.payload.splitDetail).toEqual({ version: 1, personalItems: {}, customShares: { a: 60 } })
  })

  it("loads a multi-payer expense for edit and keeps the stored payer amounts on save", async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "e2",
        amount: 100,
        currency: "TWD",
        description: "共乘",
        category: "transport",
        image: null,
        location: null,
        latitude: null,
        longitude: null,
        expenseDate: new Date(2026, 10, 16, 19).toISOString(),
        payers: [
          { memberId: "a", amount: 30, member: { id: "a", displayName: "小雨" } },
          { memberId: "b", amount: 70, member: { id: "b", displayName: "志明" } },
        ],
        participants: [
          { memberId: "a", shareAmount: 50, member: { id: "a", displayName: "小雨" } },
          { memberId: "b", shareAmount: 50, member: { id: "b", displayName: "志明" } },
        ],
        splitDetail: null,
      }),
    })
    render(<ExpenseFormV2 projectId="p1" expenseId="e2" mode="edit" />)
    expect(await screen.findByDisplayValue("共乘")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "儲存變更 · TWD 100" }))
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    const req = mockSave.mock.calls[0][0]
    expect(req.payload.payers).toEqual([
      { memberId: "a", amount: 30 },
      { memberId: "b", amount: 70 },
    ])
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
        payers: [{ memberId: "a", amount: 100, member: { id: "a", displayName: "小雨" } }],
        participants: [{ memberId: "a", shareAmount: 100, member: { id: "a", displayName: "小雨" } }],
        splitDetail: null,
      }),
    })
    render(<ExpenseFormV2 projectId="p1" expenseId="e1" mode="edit" />)
    fireEvent.click(await screen.findByRole("button", { name: "刪除此筆" }))
    fireEvent.click(await screen.findByRole("button", { name: "刪除" }))
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(expect.objectContaining({ expenseId: "e1" })))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/projects/p1/expenses"))
  })

  it("prefills the current location in create mode via the shared geolocation helper", async () => {
    mockGetCurrentLocation.mockResolvedValueOnce({ location: "台北市", latitude: 25.03, longitude: 121.56 })
    render(<ExpenseFormV2 projectId="p1" mode="create" />)
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("台北市"))
  })

  it("does not fetch the current location in edit mode", async () => {
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
        payers: [{ memberId: "a", amount: 100, member: { id: "a", displayName: "小雨" } }],
        participants: [{ memberId: "a", shareAmount: 100, member: { id: "a", displayName: "小雨" } }],
        splitDetail: null,
      }),
    })
    render(<ExpenseFormV2 projectId="p1" expenseId="e1" mode="edit" />)
    await screen.findByDisplayValue("晚餐")
    expect(mockGetCurrentLocation).not.toHaveBeenCalled()
  })

  it("alerts and redirects to the expenses list when the edit-mode load response is not ok", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})
    mockAuthFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "找不到支出" }),
    })
    render(<ExpenseFormV2 projectId="p1" expenseId="e1" mode="edit" />)
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("無法載入支出資料")))
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("找不到支出"))
    expect(mockPush).toHaveBeenCalledWith("/projects/p1/expenses")
    alertSpy.mockRestore()
  })

  it("alerts and redirects to the expenses list when the edit-mode load throws", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})
    mockAuthFetch.mockRejectedValueOnce(new Error("網路錯誤"))
    render(<ExpenseFormV2 projectId="p1" expenseId="e1" mode="edit" />)
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("載入失敗")))
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("網路錯誤"))
    expect(mockPush).toHaveBeenCalledWith("/projects/p1/expenses")
    alertSpy.mockRestore()
  })

  it("keeps a legacy 60/40 split when only the description changes", async () => {
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
        payers: [{ memberId: "a", amount: 100, member: { id: "a", displayName: "小雨" } }],
        participants: [
          { memberId: "a", shareAmount: 60, member: { id: "a", displayName: "小雨" } },
          { memberId: "b", shareAmount: 40, member: { id: "b", displayName: "志明" } },
        ],
        // Legacy expense: no stored splitDetail even though the split isn't equal.
        splitDetail: null,
      }),
    })
    render(<ExpenseFormV2 projectId="p1" expenseId="e1" mode="edit" />)
    const descriptionInput = await screen.findByDisplayValue("晚餐")
    fireEvent.change(descriptionInput, { target: { value: "晚餐（補發票）" } })
    fireEvent.click(screen.getByRole("button", { name: "儲存變更 · TWD 100" }))
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    const req = mockSave.mock.calls[0][0]
    expect(req.payload.participants).toEqual([
      { memberId: "a", shareAmount: 60 },
      { memberId: "b", shareAmount: 40 },
    ])
  })
})
