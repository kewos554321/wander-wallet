import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import {
  useProjectData,
  clearProjectCache,
  invalidateProjectCache,
} from "@/lib/hooks/useProjectData"

// Mock authFetch
const mockAuthFetch = vi.fn()

vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
}))

const mockProject = {
  id: "project-1",
  name: "Test Project",
  description: "A test project",
  budget: "10000",
  currency: "TWD",
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  customRates: { USD: 30 },
  creator: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
  },
}

const mockMembers = [
  {
    id: "member-1",
    role: "owner",
    displayName: "Test User",
    userId: "user-1",
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      image: null,
    },
  },
  {
    id: "member-2",
    role: "member",
    displayName: "Second User",
    userId: "user-2",
    user: {
      id: "user-2",
      name: "Second User",
      email: "second@example.com",
      image: null,
    },
  },
]

describe("useProjectData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearProjectCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("data fetching", () => {
    it("should fetch project and members on mount", async () => {
      mockAuthFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProject),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMembers),
        })

      const { result } = renderHook(() => useProjectData("project-1"))

      expect(result.current.loading).toBe(true)

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.project).toEqual(mockProject)
      expect(result.current.members).toEqual(mockMembers)
      expect(result.current.error).toBeNull()
    })

    it("should not fetch when autoFetch is false", () => {
      renderHook(() => useProjectData("project-1", { autoFetch: false }))

      expect(mockAuthFetch).not.toHaveBeenCalled()
    })

    it("should not fetch members when includeMembers is false", async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProject),
      })

      const { result } = renderHook(() =>
        useProjectData("project-1", { includeMembers: false })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(mockAuthFetch).toHaveBeenCalledTimes(1)
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/project-1")
      expect(result.current.members).toEqual([])
    })
  })

  describe("error handling", () => {
    it("should set error when project fetch fails", async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Not found" }),
      })

      const { result } = renderHook(() => useProjectData("project-1"))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.error).toBe("無法載入專案")
      expect(result.current.project).toBeNull()
    })

    it("should handle member fetch failure gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      mockAuthFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProject),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: "Failed" }),
        })

      const { result } = renderHook(() => useProjectData("project-1"))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.project).toEqual(mockProject)
      expect(result.current.members).toEqual([])

      consoleSpy.mockRestore()
    })

    it("should handle network error", async () => {
      mockAuthFetch.mockRejectedValue(new Error("Network error"))

      const { result } = renderHook(() => useProjectData("project-1"))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.error).toBe("Network error")
    })
  })

  describe("caching", () => {
    it("should use cached data on subsequent calls", async () => {
      mockAuthFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProject),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMembers),
        })

      // First render
      const { result: result1 } = renderHook(() =>
        useProjectData("project-1")
      )

      await waitFor(() => expect(result1.current.loading).toBe(false))

      expect(mockAuthFetch).toHaveBeenCalledTimes(2)

      // Second render - should use cache
      const { result: result2 } = renderHook(() =>
        useProjectData("project-1")
      )

      await waitFor(() => expect(result2.current.loading).toBe(false))

      // Should not make additional API calls
      expect(mockAuthFetch).toHaveBeenCalledTimes(2)
      expect(result2.current.project).toEqual(mockProject)
    })

    it("should fetch different projects separately", async () => {
      mockAuthFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProject),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMembers),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ...mockProject, id: "project-2", name: "Project 2" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })

      const { result: result1 } = renderHook(() =>
        useProjectData("project-1")
      )

      await waitFor(() => expect(result1.current.loading).toBe(false))

      const { result: result2 } = renderHook(() =>
        useProjectData("project-2")
      )

      await waitFor(() => expect(result2.current.loading).toBe(false))

      expect(mockAuthFetch).toHaveBeenCalledTimes(4)
      expect(result1.current.project?.name).toBe("Test Project")
      expect(result2.current.project?.name).toBe("Project 2")
    })
  })

  describe("refetch", () => {
    it("should refetch project data without cache", async () => {
      mockAuthFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProject),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMembers),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ...mockProject, name: "Updated Project" }),
        })

      const { result } = renderHook(() => useProjectData("project-1"))

      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.refetch()
      })

      expect(result.current.project?.name).toBe("Updated Project")
    })

    it("should refetch members data without cache", async () => {
      mockAuthFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProject),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMembers),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve([
              ...mockMembers,
              { id: "member-3", role: "member", displayName: "New Member", userId: null, user: null },
            ]),
        })

      const { result } = renderHook(() => useProjectData("project-1"))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.members).toHaveLength(2)

      await act(async () => {
        await result.current.refetchMembers()
      })

      expect(result.current.members).toHaveLength(3)
    })
  })

  describe("invalidate", () => {
    it("should clear cache and refetch all data", async () => {
      mockAuthFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProject),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMembers),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ...mockProject, name: "Refreshed" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })

      const { result } = renderHook(() => useProjectData("project-1"))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(mockAuthFetch).toHaveBeenCalledTimes(2)

      await act(async () => {
        await result.current.invalidate()
      })

      expect(mockAuthFetch).toHaveBeenCalledTimes(4)
      expect(result.current.project?.name).toBe("Refreshed")
    })
  })

  describe("projectCurrency", () => {
    it("should return project currency", async () => {
      mockAuthFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProject),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMembers),
        })

      const { result } = renderHook(() => useProjectData("project-1"))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.projectCurrency).toBe("TWD")
    })

    it("should return default currency when project not loaded", () => {
      mockAuthFetch.mockImplementation(() => new Promise(() => {}))

      const { result } = renderHook(() =>
        useProjectData("project-1", { autoFetch: false })
      )

      expect(result.current.projectCurrency).toBe("TWD") // DEFAULT_CURRENCY
    })
  })

  describe("customRates", () => {
    it("should return custom rates from project", async () => {
      mockAuthFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProject),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMembers),
        })

      const { result } = renderHook(() => useProjectData("project-1"))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.customRates).toEqual({ USD: 30 })
    })

    it("should return null when project has no custom rates", async () => {
      mockAuthFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ...mockProject, customRates: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMembers),
        })

      const { result } = renderHook(() => useProjectData("project-1"))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.customRates).toBeNull()
    })
  })

  describe("utility functions", () => {
    it("clearProjectCache should clear all caches", async () => {
      mockAuthFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProject),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMembers),
        })

      const { result } = renderHook(() => useProjectData("project-1"))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(mockAuthFetch).toHaveBeenCalledTimes(2)

      // Clear cache
      clearProjectCache()

      // Setup new responses
      mockAuthFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProject),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMembers),
        })

      // New hook should fetch again
      const { result: result2 } = renderHook(() =>
        useProjectData("project-1")
      )

      await waitFor(() => expect(result2.current.loading).toBe(false))

      expect(mockAuthFetch).toHaveBeenCalledTimes(4)
    })

    it("invalidateProjectCache should clear specific project cache", async () => {
      mockAuthFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProject),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMembers),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ...mockProject, id: "project-2" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })

      // Load two projects
      const { result: result1 } = renderHook(() =>
        useProjectData("project-1")
      )
      await waitFor(() => expect(result1.current.loading).toBe(false))

      const { result: result2 } = renderHook(() =>
        useProjectData("project-2")
      )
      await waitFor(() => expect(result2.current.loading).toBe(false))

      expect(mockAuthFetch).toHaveBeenCalledTimes(4)

      // Invalidate only project-1
      invalidateProjectCache("project-1")

      // Setup new response for project-1
      mockAuthFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProject),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMembers),
        })

      // New hook for project-1 should fetch
      const { result: result3 } = renderHook(() =>
        useProjectData("project-1")
      )
      await waitFor(() => expect(result3.current.loading).toBe(false))

      expect(mockAuthFetch).toHaveBeenCalledTimes(6)

      // New hook for project-2 should use cache
      const { result: result4 } = renderHook(() =>
        useProjectData("project-2")
      )
      await waitFor(() => expect(result4.current.loading).toBe(false))

      // Should not make more calls (uses cache)
      expect(mockAuthFetch).toHaveBeenCalledTimes(6)
    })
  })
})
