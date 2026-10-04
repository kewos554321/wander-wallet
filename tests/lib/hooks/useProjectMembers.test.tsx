import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"

const mockAuthFetch = vi.fn()
const mockPush = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
  useLiff: () => ({ user: { id: "u1" } }),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))

import { useProjectMembers, type MembersProject } from "@/lib/hooks/useProjectMembers"

const project: MembersProject = {
  id: "p1",
  name: "東京",
  createdBy: "u1",
  creator: { id: "u1", name: "Emma", email: "e@x.com" },
  members: [
    { id: "m1", userId: "u1", role: "owner", displayName: "Emma", claimedAt: null, user: { id: "u1", name: "Emma", email: "e@x.com", image: null } },
    { id: "m2", userId: null, role: "member", displayName: "阿凱", claimedAt: null, user: null },
  ],
}

const ok = (body: unknown) => ({ ok: true, json: async () => body })
const fail = (body: unknown) => ({ ok: false, json: async () => body })

describe("useProjectMembers", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset()
    mockPush.mockReset()
    vi.spyOn(window, "alert").mockImplementation(() => {})
  })

  it("loads the project and knows the owner", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok(project))
    const { result } = renderHook(() => useProjectMembers("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.project?.members).toHaveLength(2)
    expect(result.current.isOwner).toBe(true)
    expect(result.current.currentUserId).toBe("u1")
  })

  it("is not owner for other users", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok({ ...project, createdBy: "u9", creator: { id: "u9", name: null, email: "x" } }))
    const { result } = renderHook(() => useProjectMembers("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isOwner).toBe(false)
  })

  it("redirects when loading fails", async () => {
    mockAuthFetch.mockResolvedValueOnce(fail({}))
    renderHook(() => useProjectMembers("p1"))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/projects"))
  })

  it("adds a member and reloads", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok(project)).mockResolvedValueOnce(ok({})).mockResolvedValueOnce(ok(project))
    const { result } = renderHook(() => useProjectMembers("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let error: string | null = "x"
    await act(async () => {
      error = await result.current.addMember("  小雨 ")
    })
    expect(error).toBeNull()
    expect(mockAuthFetch).toHaveBeenNthCalledWith(
      2,
      "/api/projects/p1/members",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "小雨" }) })
    )
    expect(mockAuthFetch).toHaveBeenCalledTimes(3)
  })

  it("returns the add error", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok(project)).mockResolvedValueOnce(fail({ error: "名稱重複" }))
    const { result } = renderHook(() => useProjectMembers("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let error: string | null = null
    await act(async () => {
      error = await result.current.addMember("阿凱")
    })
    expect(error).toBe("名稱重複")
  })

  it("removes a member", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok(project)).mockResolvedValueOnce(ok({})).mockResolvedValueOnce(ok(project))
    const { result } = renderHook(() => useProjectMembers("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.removeMember("m2")
    })
    expect(mockAuthFetch).toHaveBeenNthCalledWith(
      2,
      "/api/projects/p1/members",
      expect.objectContaining({ method: "DELETE", body: JSON.stringify({ memberId: "m2" }) })
    )
  })

  it("alerts how many batch removals failed", async () => {
    mockAuthFetch
      .mockResolvedValueOnce(ok(project))
      .mockResolvedValueOnce(ok({}))
      .mockResolvedValueOnce(fail({}))
      .mockResolvedValueOnce(ok(project))
    const { result } = renderHook(() => useProjectMembers("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.batchRemove(["m2", "m3"])
    })
    expect(window.alert).toHaveBeenCalledWith("1 位成員移除失敗")
  })
})
