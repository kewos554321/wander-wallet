import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"

const mockAuthFetch = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => mockAuthFetch }))

import { useSettlement, type SettleData } from "@/lib/hooks/useSettlement"

const data: SettleData = {
  balances: [],
  settlements: [
    {
      from: { memberId: "a", displayName: "小美", userImage: null },
      to: { memberId: "b", displayName: "Emma", userImage: null },
      amount: 2400,
    },
  ],
  expenseDetails: [
    {
      id: "e1",
      description: "晚餐",
      amount: 2400,
      currency: "TWD",
      convertedAmount: 2400,
      payers: [
        { memberId: "a", displayName: "小美", userImage: null, amount: 1200, convertedAmount: 1200 },
        { memberId: "b", displayName: "Emma", userImage: null, amount: 1200, convertedAmount: 1200 },
      ],
      participants: [],
    },
  ],
  summary: {
    totalExpenses: 3,
    totalAmount: 60730,
    totalShared: 60730,
    isBalanced: true,
    currency: "TWD",
    exchangeRatesUsed: { JPY: 0.2 },
  },
}

describe("useSettlement", () => {
  beforeEach(() => mockAuthFetch.mockReset())

  it("loads settle data", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: true, json: async () => data })
    const { result } = renderHook(() => useSettlement("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1/settle")
    expect(result.current.data).toEqual(data)
    expect(result.current.displayCurrencyCode).toBe("TWD")
  })

  it("reports the server error", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "無權限" }) })
    const { result } = renderHook(() => useSettlement("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe("無權限")
  })

  it("converts to the chosen display currency", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: true, json: async () => data })
    const { result } = renderHook(() => useSettlement("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.toDisplay(100)).toBe(100)
    act(() => result.current.setDisplayCurrency("JPY"))
    expect(result.current.displayCurrencyCode).toBe("JPY")
    expect(result.current.toDisplay(100)).toBe(500)
  })

  it("builds the share text", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: true, json: async () => data })
    const { result } = renderHook(() => useSettlement("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.shareText).toBe(
      ["💰 結算明細", "總支出：TWD 60,730", "", "📋 轉帳清單：", "1. 小美 ➡️ Emma：TWD 2,400"].join("\n")
    )
  })

  it("says everyone is settled when there are no transfers", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ...data, settlements: [] }) })
    const { result } = renderHook(() => useSettlement("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.shareText.endsWith("✅ 所有人都已結清！")).toBe(true)
  })

  it("clears the error after a successful refetch", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "無權限" }) })
    const { result } = renderHook(() => useSettlement("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe("無權限")

    mockAuthFetch.mockResolvedValueOnce({ ok: true, json: async () => data })
    await act(() => result.current.refetch())
    expect(result.current.error).toBeNull()
  })
})
