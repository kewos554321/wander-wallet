import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"

const mockAuthFetch = vi.fn()
const mockUseLiff = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
  useLiff: () => mockUseLiff(),
}))

const mockSendDelete = vi.fn()
const mockSendBatchDelete = vi.fn()
vi.mock("@/lib/liff", () => ({
  sendDeleteNotificationToChat: (p: unknown) => mockSendDelete(p),
  sendBatchDeleteNotificationToChat: (p: unknown) => mockSendBatchDelete(p),
}))

import { useProjectExpenses, type ProjectExpense } from "@/lib/hooks/useProjectExpenses"

const member = { id: "m1", displayName: "志明", userId: null, user: null }
function expense(id: string): ProjectExpense {
  return {
    id,
    amount: 100,
    currency: "TWD",
    description: id,
    category: "food",
    image: null,
    location: null,
    latitude: null,
    longitude: null,
    expenseDate: "2026-11-16T10:00:00.000Z",
    createdAt: "2026-11-16T10:01:00.000Z",
    payer: member,
    participants: [{ id: `${id}-p`, shareAmount: 100, member }],
  }
}

const ok = (body: unknown) => ({ ok: true, json: async () => body })
const fail = (body: unknown) => ({ ok: false, json: async () => body })

function liff(overrides: Record<string, unknown> = {}) {
  return {
    isDevMode: false,
    canSendMessages: true,
    user: { id: "u1", preferences: null },
    ...overrides,
  }
}

describe("useProjectExpenses", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset()
    mockSendDelete.mockReset().mockResolvedValue(undefined)
    mockSendBatchDelete.mockReset().mockResolvedValue(undefined)
    mockUseLiff.mockReturnValue(liff())
    vi.spyOn(window, "alert").mockImplementation(() => {})
  })

  it("loads expenses", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok([expense("a")]))
    const { result } = renderHook(() => useProjectExpenses("p1", { projectName: "東京" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.expenses.map((e) => e.id)).toEqual(["a"])
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1/expenses")
  })

  it("deletes one expense and notifies LINE when allowed", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok([expense("a"), expense("b")])).mockResolvedValueOnce(ok({}))
    const { result } = renderHook(() => useProjectExpenses("p1", { projectName: "東京" }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let success = false
    await act(async () => {
      success = await result.current.deleteExpense("a", { notifyLine: true })
    })

    expect(success).toBe(true)
    expect(mockAuthFetch).toHaveBeenLastCalledWith("/api/projects/p1/expenses/a", { method: "DELETE" })
    expect(result.current.expenses.map((e) => e.id)).toEqual(["b"])
    expect(mockSendDelete).toHaveBeenCalledWith(
      expect.objectContaining({ projectName: "東京", projectId: "p1", payerName: "志明", amount: 100 })
    )
  })

  it.each([
    ["the checkbox is off", {}, false],
    ["in dev mode", { isDevMode: true }, true],
    ["messages cannot be sent", { canSendMessages: false }, true],
    ["the user disabled delete notifications", { user: { id: "u1", preferences: { notifications: { expenseDeleted: false } } } }, true],
  ])("does not notify LINE when %s", async (_label, liffOverrides, notifyLine) => {
    mockUseLiff.mockReturnValue(liff(liffOverrides))
    mockAuthFetch.mockResolvedValueOnce(ok([expense("a")])).mockResolvedValueOnce(ok({}))
    const { result } = renderHook(() => useProjectExpenses("p1", { projectName: "東京" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.deleteExpense("a", { notifyLine })
    })
    expect(mockSendDelete).not.toHaveBeenCalled()
  })

  it("alerts the server error and keeps the list when delete fails", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok([expense("a")])).mockResolvedValueOnce(fail({ error: "沒有權限" }))
    const { result } = renderHook(() => useProjectExpenses("p1", { projectName: "東京" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let success = true
    await act(async () => {
      success = await result.current.deleteExpense("a", { notifyLine: false })
    })
    expect(success).toBe(false)
    expect(window.alert).toHaveBeenCalledWith("沒有權限")
    expect(result.current.expenses).toHaveLength(1)
  })

  it("batch deletes and notifies once", async () => {
    mockAuthFetch
      .mockResolvedValueOnce(ok([expense("a"), expense("b"), expense("c")]))
      .mockResolvedValueOnce(ok({}))
    const { result } = renderHook(() => useProjectExpenses("p1", { projectName: "東京" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.batchDeleteExpenses(["a", "c"], { notifyLine: true })
    })
    expect(mockAuthFetch).toHaveBeenLastCalledWith(
      "/api/projects/p1/expenses/batch",
      expect.objectContaining({ method: "DELETE", body: JSON.stringify({ expenseIds: ["a", "c"] }) })
    )
    expect(result.current.expenses.map((e) => e.id)).toEqual(["b"])
    expect(mockSendBatchDelete).toHaveBeenCalledTimes(1)
  })

  it("exposes canNotifyLine", async () => {
    mockUseLiff.mockReturnValue(liff({ isDevMode: true }))
    mockAuthFetch.mockResolvedValueOnce(ok([]))
    const { result } = renderHook(() => useProjectExpenses("p1", { projectName: "東京" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.canNotifyLine).toBe(false)
  })
})
