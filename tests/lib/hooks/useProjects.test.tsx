import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"

const mockAuthFetch = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
}))

import { useProjects } from "@/lib/hooks/useProjects"

describe("useProjects", () => {
  beforeEach(() => mockAuthFetch.mockReset())

  it("loads projects", async () => {
    mockAuthFetch.mockResolvedValue({ ok: true, json: async () => [{ id: "p1" }] })
    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.projects).toEqual([{ id: "p1" }])
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects")
  })

  it("stops loading with an empty list on error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    mockAuthFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.projects).toEqual([])
  })
})
