import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

const mockAuthFetch = vi.fn()
const mockUseLiff = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
  useLiff: () => mockUseLiff(),
}))
const mockNotify = vi.fn()
const mockNotifyDelete = vi.fn()
vi.mock("@/lib/liff", () => ({
  sendExpenseNotificationToChat: (p: unknown) => mockNotify(p),
  sendDeleteNotificationToChat: (p: unknown) => mockNotifyDelete(p),
}))
const mockUpload = vi.fn()
vi.mock("@/lib/image-utils", () => ({ uploadImageToR2: (...args: unknown[]) => mockUpload(...args) }))

import { useSaveExpense, type ExpensePayload } from "@/lib/hooks/useSaveExpense"

const payload: ExpensePayload = {
  paidByMemberId: "a",
  amount: 100,
  currency: "TWD",
  description: "午餐",
  category: "food",
  location: null,
  latitude: null,
  longitude: null,
  expenseDate: "2026-11-16T04:00:00.000Z",
  participants: [
    { memberId: "a", shareAmount: 50 },
    { memberId: "b", shareAmount: 50 },
  ],
  splitDetail: null,
}
const noImage = { url: null, pendingFile: null, pendingDeleteUrl: null }
const notify = { requested: true, projectName: "東京", payerName: "小美", changes: [] }
const ok = (body: unknown = {}) => ({ ok: true, json: async () => body })

describe("useSaveExpense", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset()
    mockNotify.mockReset().mockResolvedValue(undefined)
    mockNotifyDelete.mockReset().mockResolvedValue(undefined)
    mockUpload.mockReset()
    mockUseLiff.mockReturnValue({ isDevMode: false, canSendMessages: true, user: { preferences: null } })
  })

  it("creates an expense with splitDetail and notifies", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok())
    const { result } = renderHook(() => useSaveExpense("p1"))
    let res: unknown
    await act(async () => {
      res = await result.current.save({ mode: "create", payload, image: noImage, notification: notify })
    })
    expect(res).toEqual({ ok: true })
    const [url, init] = mockAuthFetch.mock.calls[0]
    expect(url).toBe("/api/projects/p1/expenses")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({ ...payload, image: null })
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ operationType: "create", projectId: "p1", payerName: "小美", participantCount: 2 })
    )
  })

  it("updates with PUT and skips notification when the user disabled update notices", async () => {
    mockUseLiff.mockReturnValue({
      isDevMode: false,
      canSendMessages: true,
      user: { preferences: { notifications: { expenseUpdated: false } } },
    })
    mockAuthFetch.mockResolvedValueOnce(ok())
    const { result } = renderHook(() => useSaveExpense("p1"))
    await act(async () => {
      await result.current.save({ mode: "edit", expenseId: "e1", payload, image: noImage, notification: notify })
    })
    expect(mockAuthFetch.mock.calls[0][0]).toBe("/api/projects/p1/expenses/e1")
    expect(mockAuthFetch.mock.calls[0][1].method).toBe("PUT")
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it("uploads a pending image and deletes the replaced one", async () => {
    mockUpload.mockResolvedValueOnce({ url: "https://r2/new.jpg" })
    mockAuthFetch.mockResolvedValueOnce(ok()).mockResolvedValueOnce(ok())
    const file = new File(["x"], "r.jpg", { type: "image/jpeg" })
    const { result } = renderHook(() => useSaveExpense("p1"))
    await act(async () => {
      await result.current.save({
        mode: "edit",
        expenseId: "e1",
        payload,
        image: { url: "https://r2/old.jpg", pendingFile: file, pendingDeleteUrl: "https://r2/old.jpg" },
        notification: { ...notify, requested: false },
      })
    })
    expect(JSON.parse(mockAuthFetch.mock.calls[0][1].body).image).toBe("https://r2/new.jpg")
    expect(mockAuthFetch.mock.calls[1][0]).toBe(`/api/upload?url=${encodeURIComponent("https://r2/old.jpg")}`)
  })

  it("returns the upload error without saving", async () => {
    mockUpload.mockRejectedValueOnce(new Error("boom"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    const file = new File(["x"], "r.jpg", { type: "image/jpeg" })
    const { result } = renderHook(() => useSaveExpense("p1"))
    let res: unknown
    await act(async () => {
      res = await result.current.save({
        mode: "create",
        payload,
        image: { url: null, pendingFile: file, pendingDeleteUrl: null },
        notification: notify,
      })
    })
    expect(res).toEqual({ ok: false, error: "圖片上傳失敗，請重試" })
    expect(mockAuthFetch).not.toHaveBeenCalled()
  })

  it("returns the server error", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "分攤明細與分攤金額不一致" }) })
    const { result } = renderHook(() => useSaveExpense("p1"))
    let res: unknown
    await act(async () => {
      res = await result.current.save({ mode: "create", payload, image: noImage, notification: notify })
    })
    expect(res).toEqual({ ok: false, error: "分攤明細與分攤金額不一致" })
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it("does not notify in dev mode", async () => {
    mockUseLiff.mockReturnValue({ isDevMode: true, canSendMessages: true, user: { preferences: null } })
    mockAuthFetch.mockResolvedValueOnce(ok())
    const { result } = renderHook(() => useSaveExpense("p1"))
    await act(async () => {
      await result.current.save({ mode: "create", payload, image: noImage, notification: notify })
    })
    expect(mockNotify).not.toHaveBeenCalled()
    expect(result.current.canNotifyLine).toBe(false)
  })

  it("removes an expense and sends the delete notice", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok())
    const { result } = renderHook(() => useSaveExpense("p1"))
    let res: unknown
    await act(async () => {
      res = await result.current.remove({
        expenseId: "e1",
        notification: {
          requested: true,
          projectName: "東京",
          payerName: "小美",
          amount: 100,
          description: "午餐",
          category: "food",
          participantCount: 2,
        },
      })
    })
    expect(res).toEqual({ ok: true })
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1/expenses/e1", { method: "DELETE" })
    expect(mockNotifyDelete).toHaveBeenCalledWith(expect.objectContaining({ projectId: "p1", amount: 100 }))
  })
})
