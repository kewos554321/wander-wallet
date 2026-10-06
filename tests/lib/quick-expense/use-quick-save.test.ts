import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

const authFetch = vi.fn()
const liff = { isDevMode: false, canSendMessages: true, user: { preferences: null } }
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => authFetch, useLiff: () => liff }))
const upload = vi.fn()
vi.mock("@/lib/image-utils", () => ({ uploadImageToR2: (...a: unknown[]) => upload(...a) }))
const single = vi.fn().mockResolvedValue(true)
const batch = vi.fn().mockResolvedValue(true)
vi.mock("@/lib/liff", () => ({ sendExpenseNotificationToChat: (d: unknown) => single(d), sendBatchExpenseNotificationToChat: (d: unknown) => batch(d) }))

import { useQuickSave } from "@/lib/quick-expense/use-quick-save"
import { fromParsed, type QuickItem } from "@/lib/quick-expense/draft"

const members = [{ id: "a", displayName: "小雨" }, { id: "b", displayName: "志明" }, { id: "c", displayName: "阿凱" }]
const mk = (id: string, o: Partial<QuickItem> = {}): QuickItem => ({
  ...fromParsed([{ id, amount: 100, description: "d", category: "food", currency: "TWD", payers: [{ memberId: "a", amount: 100 }], participantIds: ["a", "b", "c"], selected: true }])[0],
  ...o,
})
const ok = () => ({ ok: true, json: async () => ({}) })
const setup = () => renderHook(() => useQuickSave({ projectId: "p1", projectName: "東京", members })).result

beforeEach(() => {
  authFetch.mockReset(); upload.mockReset(); single.mockClear(); batch.mockClear()
  liff.isDevMode = false; liff.canSendMessages = true
})

describe("useQuickSave", () => {
  it("posts equal shares and notifies once with the single template", async () => {
    authFetch.mockResolvedValue(ok())
    const r = setup()
    let res
    await act(async () => { res = await r.current.save([mk("1")], { notifyLine: true }) })
    expect(res).toEqual({ savedIds: ["1"], failed: null })
    const body = JSON.parse(authFetch.mock.calls[0][1].body)
    expect(authFetch.mock.calls[0][0]).toBe("/api/projects/p1/expenses")
    expect(body.participants.map((p: { shareAmount: number }) => p.shareAmount)).toEqual([33.34, 33.33, 33.33])
    expect(body).toMatchObject({ payers: [{ memberId: "a", amount: 100 }], amount: 100, currency: "TWD", image: null })
    expect(body.splitDetail).toBeNull()
    expect(body).not.toHaveProperty("paidByMemberId")
    expect(single).toHaveBeenCalledWith(expect.objectContaining({ operationType: "create", payerName: "小雨", participantCount: 3 }))
    expect(batch).not.toHaveBeenCalled()
  })

  it("posts multiple payers with their exact amounts", async () => {
    authFetch.mockResolvedValue(ok())
    const r = setup()
    await act(async () => {
      await r.current.save(
        [mk("1", { amount: "1280", payerIds: ["a", "b"], pinnedPayerAmounts: { a: "800", b: "480" }, participantIds: ["a", "b"] })],
        { notifyLine: true }
      )
    })
    const body = JSON.parse(authFetch.mock.calls[0][1].body)
    expect(body.payers).toEqual([
      { memberId: "a", amount: 800 },
      { memberId: "b", amount: 480 },
    ])
    // Primary payer (largest amount) drives the LINE notification name.
    expect(single).toHaveBeenCalledWith(expect.objectContaining({ payerName: "小雨" }))
  })

  it("uploads pending images and still saves when upload fails", async () => {
    authFetch.mockResolvedValue(ok())
    upload.mockResolvedValueOnce({ url: "https://img/1" }).mockRejectedValueOnce(new Error("x"))
    const f = new File(["a"], "a.jpg")
    const r = setup()
    await act(async () => {
      await r.current.save([mk("1", { image: { image: null, pendingFile: f, preview: "p" } }), mk("2", { image: { image: null, pendingFile: f, preview: "p" } })], { notifyLine: true })
    })
    expect(JSON.parse(authFetch.mock.calls[0][1].body).image).toBe("https://img/1")
    expect(JSON.parse(authFetch.mock.calls[1][1].body).image).toBeNull()
    expect(batch).toHaveBeenCalledWith(expect.objectContaining({ expenses: expect.arrayContaining([expect.objectContaining({ payerName: "小雨" })]) }))
  })

  it("stops at the first failure and reports saved ids", async () => {
    authFetch.mockResolvedValueOnce(ok()).mockResolvedValueOnce({ ok: false, json: async () => ({ error: "金額錯誤" }) })
    const r = setup()
    let res
    await act(async () => { res = await r.current.save([mk("1"), mk("2"), mk("3")], { notifyLine: true }) })
    expect(res).toEqual({ savedIds: ["1"], failed: { index: 1, message: "金額錯誤" } })
    expect(authFetch).toHaveBeenCalledTimes(2)
    expect(single).toHaveBeenCalledTimes(1)
  })

  it("does not notify when off, in dev mode, or nothing saved", async () => {
    authFetch.mockResolvedValue(ok())
    let r = setup()
    await act(async () => { await r.current.save([mk("1")], { notifyLine: false }) })
    liff.isDevMode = true
    r = setup()
    expect(r.current.canNotifyLine).toBe(false)
    await act(async () => { await r.current.save([mk("1")], { notifyLine: true }) })
    liff.isDevMode = false
    authFetch.mockResolvedValue({ ok: false, json: async () => ({}) })
    r = setup()
    await act(async () => { await r.current.save([mk("1")], { notifyLine: true }) })
    expect(single).not.toHaveBeenCalled()
    expect(batch).not.toHaveBeenCalled()
  })
})
