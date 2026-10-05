import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

const authFetch = vi.fn()
const updatePreferences = vi.fn()
const liff = { user: { preferences: { defaultCurrency: "JPY", uiVersion: "v2" } as Record<string, unknown> }, updatePreferences }
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => authFetch, useLiff: () => liff }))
import { usePreferences } from "@/lib/hooks/use-preferences"

beforeEach(() => { authFetch.mockReset(); updatePreferences.mockReset() })

describe("usePreferences", () => {
  it("merges defaults for reading", () => {
    const h = renderHook(() => usePreferences())
    expect(h.result.current.preferences.defaultCurrency).toBe("JPY")
    expect(h.result.current.preferences.notifications.expenseCreated).toBe(true)
  })
  it("saves a patch and keeps uiVersion", async () => {
    authFetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    const h = renderHook(() => usePreferences())
    let ok
    await act(async () => { ok = await h.result.current.save({ notifications: { expenseDeleted: false } }) })
    expect(ok).toBe(true)
    const body = JSON.parse(authFetch.mock.calls[0][1].body)
    expect(authFetch.mock.calls[0][0]).toBe("/api/users/profile")
    expect(body.preferences).toMatchObject({ uiVersion: "v2", defaultCurrency: "JPY", notifications: { expenseCreated: true, expenseUpdated: true, expenseDeleted: false } })
    expect(updatePreferences).toHaveBeenCalledWith(body.preferences)
  })
  it("reports failure without updating local state", async () => {
    authFetch.mockResolvedValue({ ok: false, json: async () => ({ error: "x" }) })
    const h = renderHook(() => usePreferences())
    let ok
    await act(async () => { ok = await h.result.current.save({ defaultSplitMode: "custom" }) })
    expect(ok).toBe(false)
    expect(h.result.current.error).toBe("儲存失敗，請重試")
    expect(updatePreferences).not.toHaveBeenCalled()
  })
})
