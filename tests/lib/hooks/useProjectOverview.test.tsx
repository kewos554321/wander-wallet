import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import type { OverviewProject } from "@/lib/project-overview"

const mockAuthFetch = vi.fn()
const mockPush = vi.fn()

vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
  useLiff: () => ({ user: { id: "u1" } }),
}))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))
vi.mock("@/lib/hooks/useCurrencyConversion", () => ({
  useCurrencyConversion: () => ({ convert: (amount: number) => amount }),
}))

import { useProjectOverview } from "@/lib/hooks/useProjectOverview"

const mockProject: OverviewProject = {
  id: "p1",
  name: "Test Trip",
  description: null,
  budget: null,
  currency: "TWD",
  exchangeRatePrecision: 2,
  startDate: null,
  endDate: null,
  customRates: null,
  creator: { id: "u1", name: "Emma", email: "e@x.com" },
  members: [{ id: "me", role: "owner", displayName: "Emma", user: { id: "u1", name: "Emma", email: "e@x.com", image: null } }],
  expenses: [],
}

function okJson(data: unknown) {
  return { ok: true, json: () => Promise.resolve(data) }
}

function errJson(status: number, data: unknown = {}) {
  return { ok: false, status, json: () => Promise.resolve(data) }
}

describe("useProjectOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("sets project and summary when the response is a member project", async () => {
    mockAuthFetch.mockResolvedValueOnce(okJson(mockProject))

    const { result } = renderHook(() => useProjectOverview("p1"))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.project).toEqual(mockProject)
    expect(result.current.joinInfo).toBeNull()
    expect(result.current.summary).not.toBeNull()
  })

  it("sets joinInfo when the response marks the user as a non-member", async () => {
    mockAuthFetch.mockResolvedValueOnce(
      okJson({
        isMember: false,
        name: "Osaka Trip",
        description: "A fun trip",
        unclaimedMembers: [{ id: "m1", displayName: "Placeholder" }],
      })
    )

    const { result } = renderHook(() => useProjectOverview("p1"))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.project).toBeNull()
    expect(result.current.joinInfo).toEqual({
      name: "Osaka Trip",
      description: "A fun trip",
      joinMode: "both",
      unclaimedMembers: [{ id: "m1", displayName: "Placeholder" }],
    })
  })

  it("redirects to /projects on 404", async () => {
    mockAuthFetch.mockResolvedValueOnce(errJson(404))

    const { result } = renderHook(() => useProjectOverview("missing"))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/projects"))
    expect(result.current.project).toBeNull()
  })

  it("joinProject posts to the join endpoint and refetches as a member", async () => {
    mockAuthFetch
      .mockResolvedValueOnce(
        okJson({
          isMember: false,
          name: "Osaka Trip",
          description: null,
          joinMode: "both",
          unclaimedMembers: [],
        })
      )
      .mockResolvedValueOnce(okJson({}))
      .mockResolvedValueOnce(okJson(mockProject))

    const { result } = renderHook(() => useProjectOverview("p1"))

    await waitFor(() => expect(result.current.joinInfo).not.toBeNull())

    await act(async () => {
      await result.current.joinProject()
    })

    expect(mockAuthFetch).toHaveBeenCalledWith(
      "/api/projects/join",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ projectId: "p1" }),
      })
    )
    expect(result.current.joinInfo).toBeNull()
    expect(result.current.project).toEqual(mockProject)
    expect(result.current.joining).toBe(false)
  })

  it("claimMember posts to the claim endpoint with the memberId", async () => {
    mockAuthFetch
      .mockResolvedValueOnce(
        okJson({
          isMember: false,
          name: "Osaka Trip",
          description: null,
          joinMode: "claim_only",
          unclaimedMembers: [{ id: "m1", displayName: "Placeholder" }],
        })
      )
      .mockResolvedValueOnce(okJson({}))
      .mockResolvedValueOnce(okJson(mockProject))

    const { result } = renderHook(() => useProjectOverview("p1"))

    await waitFor(() => expect(result.current.joinInfo).not.toBeNull())

    await act(async () => {
      await result.current.claimMember("m1")
    })

    expect(mockAuthFetch).toHaveBeenCalledWith(
      "/api/projects/p1/members/claim",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ memberId: "m1" }),
      })
    )
    expect(result.current.project).toEqual(mockProject)
  })

  it("alerts with the server error text when join fails", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})
    mockAuthFetch
      .mockResolvedValueOnce(
        okJson({
          isMember: false,
          name: "Osaka Trip",
          description: null,
          joinMode: "both",
          unclaimedMembers: [],
        })
      )
      .mockResolvedValueOnce(errJson(400, { error: "此專案不允許加入" }))

    const { result } = renderHook(() => useProjectOverview("p1"))

    await waitFor(() => expect(result.current.joinInfo).not.toBeNull())

    await act(async () => {
      await result.current.joinProject()
    })

    expect(alertSpy).toHaveBeenCalledWith("此專案不允許加入")
    expect(result.current.joining).toBe(false)
  })

  it("alerts with the fallback error text when the server gives no error text", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})
    mockAuthFetch
      .mockResolvedValueOnce(
        okJson({
          isMember: false,
          name: "Osaka Trip",
          description: null,
          joinMode: "both",
          unclaimedMembers: [],
        })
      )
      .mockResolvedValueOnce(errJson(400, {}))

    const { result } = renderHook(() => useProjectOverview("p1"))

    await waitFor(() => expect(result.current.joinInfo).not.toBeNull())

    await act(async () => {
      await result.current.joinProject()
    })

    expect(alertSpy).toHaveBeenCalledWith("加入失敗")
  })
})
