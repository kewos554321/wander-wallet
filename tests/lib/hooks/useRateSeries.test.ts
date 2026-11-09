import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useRateSeries } from "@/lib/hooks/useRateSeries"

const mockAuthFetch = vi.fn()

vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
}))

describe("useRateSeries", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset()
  })

  it("fetches a series for the selected end date and range", async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        points: [
          { date: "2026-10-11", rate: 31.8 },
          { date: "2026-11-09", rate: 32.1 },
        ],
      }),
    })

    const { result } = renderHook(() =>
      useRateSeries({ base: "USD", quote: "TWD", endDate: "2026-11-09", days: 30 })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockAuthFetch).toHaveBeenCalledWith(
      "/api/exchange-rates?start=2026-10-11&end=2026-11-09&base=USD&quote=TWD"
    )
    expect(result.current.startDate).toBe("2026-10-11")
    expect(result.current.endDate).toBe("2026-11-09")
    expect(result.current.points).toEqual([
      { date: "2026-10-11", rate: 31.8 },
      { date: "2026-11-09", rate: 32.1 },
    ])
  })

  it("surfaces a retryable error", async () => {
    mockAuthFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "查不到趨勢資料" }),
    })

    const { result } = renderHook(() =>
      useRateSeries({ base: "USD", quote: "TWD", endDate: "2026-11-09", days: 30 })
    )

    await waitFor(() => expect(result.current.error).toBe("查不到趨勢資料"))
    expect(result.current.points).toBeNull()
  })

  it("does not fetch when the pair is the same currency", async () => {
    const { result } = renderHook(() =>
      useRateSeries({ base: "TWD", quote: "TWD", endDate: "2026-11-09", days: 30 })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockAuthFetch).not.toHaveBeenCalled()
    expect(result.current.points).toBeNull()
  })
})
