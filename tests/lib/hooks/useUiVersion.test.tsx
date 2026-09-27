import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"

const mockUseLiff = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => mockUseLiff(),
}))

import { useUiVersion } from "@/lib/hooks/useUiVersion"

function setUrl(search: string) {
  window.history.replaceState(null, "", `/projects${search}`)
}

describe("useUiVersion", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    setUrl("")
    mockUseLiff.mockReturnValue({ user: { preferences: null } })
  })

  it("defaults to v1 without override", async () => {
    const { result } = renderHook(() => useUiVersion())
    await waitFor(() => expect(result.current.version).toBe("v1"))
    expect(result.current.overridden).toBe(false)
  })

  it("reads ?ui=v2 and persists it for later pages", async () => {
    setUrl("?ui=v2")
    const { result } = renderHook(() => useUiVersion())
    await waitFor(() => expect(result.current.version).toBe("v2"))
    expect(result.current.overridden).toBe(true)
    expect(window.sessionStorage.getItem("ww-ui-version")).toBe("v2")
  })

  it("uses the user preference", async () => {
    mockUseLiff.mockReturnValue({ user: { preferences: { uiVersion: "v2" } } })
    const { result } = renderHook(() => useUiVersion())
    await waitFor(() => expect(result.current.version).toBe("v2"))
    expect(result.current.overridden).toBe(false)
  })

  it("setVersion switches every mounted consumer", async () => {
    setUrl("?ui=v2")
    const a = renderHook(() => useUiVersion())
    const b = renderHook(() => useUiVersion())
    await waitFor(() => expect(a.result.current.version).toBe("v2"))

    act(() => a.result.current.setVersion("v1"))

    await waitFor(() => expect(b.result.current.version).toBe("v1"))
    expect(window.location.search).toBe("?ui=v1")
  })

  it("still honours ?ui when sessionStorage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    setUrl("?ui=v2")
    const { result } = renderHook(() => useUiVersion())
    await waitFor(() => expect(result.current.version).toBe("v2"))
    vi.restoreAllMocks()
  })
})
