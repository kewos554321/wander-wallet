import { describe, it, expect, vi } from "vitest"
import { parseText, parseReceipt, receiptToItem } from "@/lib/quick-expense/parse"

const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response

describe("parseText", () => {
  const input = { transcript: "早餐 100", members: [{ id: "a", displayName: "小雨" }], currentUserMemberId: "a", defaultCurrency: "TWD" }
  it("posts the transcript and returns expenses", async () => {
    const f = vi.fn().mockResolvedValue(json(200, { success: true, data: { expenses: [{ id: "1" }], confidence: 1 } }))
    await expect(parseText(f, input)).resolves.toEqual([{ id: "1" }])
    expect(f).toHaveBeenCalledWith("/api/voice/parse", expect.objectContaining({ method: "POST", body: JSON.stringify(input) }))
  })
  it("throws the server error", async () => {
    await expect(parseText(vi.fn().mockResolvedValue(json(500, { error: "壞了" })), input)).rejects.toThrow("壞了")
  })
  it("throws a default message on non-json errors", async () => {
    const bad = { ok: false, status: 502, json: async () => { throw new Error("x") } } as unknown as Response
    await expect(parseText(vi.fn().mockResolvedValue(bad), input)).rejects.toThrow("解析失敗，請重試")
  })
})

describe("parseReceipt", () => {
  it("posts the image as a data url", async () => {
    const f = vi.fn().mockResolvedValue(json(200, { success: true, data: { amount: 5 } }))
    const file = new File(["abc"], "r.jpg", { type: "image/jpeg" })
    await expect(parseReceipt(f, file)).resolves.toEqual({ amount: 5 })
    const body = JSON.parse(f.mock.calls[0][1].body)
    expect(body.imageData).toMatch(/^data:image\/jpeg;base64,/)
  })
  it("throws 收據辨識失敗 by default", async () => {
    await expect(parseReceipt(vi.fn().mockResolvedValue(json(500, {})), new File(["a"], "r.jpg"))).rejects.toThrow("收據辨識失敗")
  })
})

describe("receiptToItem", () => {
  const file = new File(["a"], "r.jpg")
  const o = { currency: "JPY", payerId: "a", memberIds: ["a", "b"], file, preview: "blob:1", today: new Date("2026-09-28T00:00:00Z") }
  it("maps the receipt with payer, all members, image and date", () => {
    const q = receiptToItem({ amount: 1200, description: "拉麵", category: "food", date: "2026-09-20", confidence: 0.9 }, o)
    expect(q).toMatchObject({ amount: "1200", description: "拉麵", category: "food", currency: "JPY", payerId: "a", participantIds: ["a", "b"] })
    expect(q.image).toEqual({ image: null, pendingFile: file, preview: "blob:1" })
    expect(q.expenseDate).toEqual(new Date("2026-09-20"))
    expect(q.id).toMatch(/^receipt-/)
  })
  it("falls back to today and other", () => {
    const q = receiptToItem({ amount: 1, description: "", category: "weird", date: null, confidence: 0 }, o)
    expect(q.expenseDate).toEqual(o.today)
    expect(q.category).toBe("other")
  })
  it("falls back to today for an invalid date", () => {
    expect(receiptToItem({ amount: 1, description: "", category: "food", date: "nope", confidence: 0 }, o).expenseDate).toEqual(o.today)
  })
})
