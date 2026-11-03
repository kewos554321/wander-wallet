import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"

const authFetch = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => authFetch,
  useLiff: () => ({ isDevMode: true, canSendMessages: false, user: null }),
}))

import { useProjectData, clearProjectCache } from "@/lib/hooks/useProjectData"
import { useSaveExpense } from "@/lib/hooks/useSaveExpense"
import type { ExpensePayload } from "@/lib/hooks/useSaveExpense"

const payload: ExpensePayload = {
  payers: [{ memberId: "a", amount: 100 }],
  amount: 100,
  currency: "TWD",
  description: null,
  category: "other",
  location: null,
  latitude: null,
  longitude: null,
  expenseDate: new Date().toISOString(),
  participants: [{ memberId: "a", shareAmount: 100 }],
  splitDetail: null,
}

beforeEach(() => {
  authFetch.mockReset()
  clearProjectCache()
})

describe("useSaveExpense cache invalidation", () => {
  it("clears the project cache after a successful save so the next load refetches", async () => {
    authFetch.mockResolvedValue({ ok: true, json: async () => ({ id: "p1", name: "x", currency: "TWD" }) })

    // Prime the cache.
    const first = renderHook(() => useProjectData("p1", { includeMembers: false }))
    await waitFor(() => expect(first.result.current.loading).toBe(false))
    const callsAfterFirst = authFetch.mock.calls.length
    first.unmount()

    // A second mount within the cache window must NOT refetch.
    const cached = renderHook(() => useProjectData("p1", { includeMembers: false }))
    await waitFor(() => expect(cached.result.current.loading).toBe(false))
    expect(authFetch.mock.calls.length).toBe(callsAfterFirst)
    cached.unmount()

    // Saving an expense must invalidate the project cache.
    const saver = renderHook(() => useSaveExpense("p1"))
    await act(async () => {
      await saver.result.current.save({
        mode: "create",
        payload,
        image: { url: null, pendingFile: null, pendingDeleteUrl: null },
        notification: { requested: false, projectName: "x", payerName: "y", changes: [] },
      })
    })
    const callsAfterSave = authFetch.mock.calls.length

    // A mount after the save must refetch.
    const refetched = renderHook(() => useProjectData("p1", { includeMembers: false }))
    await waitFor(() => expect(refetched.result.current.loading).toBe(false))
    expect(authFetch.mock.calls.length).toBeGreaterThan(callsAfterSave)
  })
})
