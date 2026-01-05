import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { AdContainer, AdSlot } from "@/components/ads/ad-container"
import type { Ad } from "@/types/ads"

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

// Mock window.open
const mockWindowOpen = vi.fn()
vi.stubGlobal("open", mockWindowOpen)

// Mock IntersectionObserver
const mockObserve = vi.fn()
const mockUnobserve = vi.fn()
const mockDisconnect = vi.fn()

vi.stubGlobal("IntersectionObserver", class {
  constructor(public callback: IntersectionObserverCallback) {}
  observe = mockObserve
  unobserve = mockUnobserve
  disconnect = mockDisconnect
})

// Mock ad tracking
vi.mock("@/lib/ads/tracking", () => ({
  trackAdEvent: vi.fn(),
  getAnonymousUserId: vi.fn().mockReturnValue("anon-123"),
  hasTrackedImpression: vi.fn().mockReturnValue(false),
}))

describe("AdContainer Component", () => {
  const mockAd: Ad = {
    id: "ad-1",
    title: "Test Ad",
    description: "Test Description",
    imageUrl: "https://example.com/image.jpg",
    targetUrl: "https://example.com",
    type: "banner",
    status: "active",
    priority: 1,
    placements: [],
    totalImpressions: 0,
    totalClicks: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("successful ad fetch", () => {
    it("should render banner ad when variant is banner", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ad: mockAd }),
      })

      render(<AdContainer placement="dashboard" variant="banner" />)

      await waitFor(() => {
        expect(screen.getByText("Test Ad")).toBeInTheDocument()
      })
    })

    it("should render based on ad type when variant is auto", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ad: mockAd }),
      })

      render(<AdContainer placement="dashboard" variant="auto" />)

      await waitFor(() => {
        expect(screen.getByText("Test Ad")).toBeInTheDocument()
      })
    })

    it("should call fetch with correct placement", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ad: null }),
      })

      render(<AdContainer placement="project_list" />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/ads?placement=project_list")
      })
    })
  })

  describe("error handling", () => {
    it("should render fallback when fetch fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      render(
        <AdContainer
          placement="dashboard"
          fallback={<div>No ads available</div>}
        />
      )

      await waitFor(() => {
        expect(screen.getByText("No ads available")).toBeInTheDocument()
      })
    })

    it("should render fallback when no ad returned", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ad: null }),
      })

      render(
        <AdContainer
          placement="dashboard"
          fallback={<div>No ads</div>}
        />
      )

      await waitFor(() => {
        expect(screen.getByText("No ads")).toBeInTheDocument()
      })
    })

    it("should render nothing when no ad and no fallback", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ad: null }),
      })

      const { container } = render(<AdContainer placement="dashboard" />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      // After loading, if no ad and no fallback, render nothing
      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })
  })

  describe("click tracking", () => {
    it("should open target URL on click", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ad: mockAd }),
      })

      render(<AdContainer placement="dashboard" variant="banner" />)

      await waitFor(() => {
        expect(screen.getByText("Test Ad")).toBeInTheDocument()
      })

      const adElement = screen.getByText("Test Ad").closest("div")
      fireEvent.click(adElement!)

      expect(mockWindowOpen).toHaveBeenCalledWith(
        "https://example.com",
        "_blank",
        "noopener,noreferrer"
      )
    })
  })

  describe("exports", () => {
    it("should export AdContainer component", () => {
      expect(AdContainer).toBeDefined()
      expect(typeof AdContainer).toBe("function")
    })
  })
})

describe("AdSlot Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ad: null }),
    })
  })

  describe("interval logic", () => {
    it("should not render when index is not at interval", () => {
      const { container } = render(
        <AdSlot placement="expense_list" index={0} interval={3} />
      )

      expect(container.firstChild).toBeNull()
    })

    it("should not render at index 1 with interval 3", () => {
      const { container } = render(
        <AdSlot placement="expense_list" index={1} interval={3} />
      )

      expect(container.firstChild).toBeNull()
    })

    it("should attempt to render at index 2 with interval 3", () => {
      render(<AdSlot placement="expense_list" index={2} interval={3} />)

      // Just verify the component renders without throwing
      expect(mockFetch).toHaveBeenCalled()
    })

    it("should attempt to render at index 5 with interval 3", () => {
      render(<AdSlot placement="expense_list" index={5} interval={3} />)

      expect(mockFetch).toHaveBeenCalled()
    })

    it("should not render at index 3 with interval 3", () => {
      const { container } = render(
        <AdSlot placement="expense_list" index={3} interval={3} />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe("exports", () => {
    it("should export AdSlot component", () => {
      expect(AdSlot).toBeDefined()
      expect(typeof AdSlot).toBe("function")
    })
  })
})
