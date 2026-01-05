import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  trackAdEvent,
  clearTrackedImpressions,
  hasTrackedImpression,
  getAnonymousUserId,
} from "@/lib/ads/tracking"

// Mock navigator.sendBeacon
const mockSendBeacon = vi.fn()
const mockFetch = vi.fn()

describe("lib/ads/tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearTrackedImpressions()

    // Setup navigator mock
    Object.defineProperty(global, "navigator", {
      value: {
        sendBeacon: mockSendBeacon,
      },
      writable: true,
      configurable: true,
    })

    // Setup fetch mock
    global.fetch = mockFetch
    mockFetch.mockResolvedValue({ ok: true })
    mockSendBeacon.mockReturnValue(true)
  })

  afterEach(() => {
    clearTrackedImpressions()
  })

  describe("trackAdEvent", () => {
    it("should track impression using sendBeacon", async () => {
      await trackAdEvent("ad-123", "impression")

      expect(mockSendBeacon).toHaveBeenCalledWith(
        "/api/ads/track",
        expect.stringContaining('"adId":"ad-123"')
      )
      expect(mockSendBeacon).toHaveBeenCalledWith(
        "/api/ads/track",
        expect.stringContaining('"event":"impression"')
      )
    })

    it("should track click using sendBeacon", async () => {
      await trackAdEvent("ad-123", "click")

      expect(mockSendBeacon).toHaveBeenCalledWith(
        "/api/ads/track",
        expect.stringContaining('"event":"click"')
      )
    })

    it("should include userId when provided", async () => {
      await trackAdEvent("ad-123", "impression", "user-456")

      expect(mockSendBeacon).toHaveBeenCalledWith(
        "/api/ads/track",
        expect.stringContaining('"userId":"user-456"')
      )
    })

    it("should include timestamp", async () => {
      await trackAdEvent("ad-123", "click")

      expect(mockSendBeacon).toHaveBeenCalledWith(
        "/api/ads/track",
        expect.stringContaining('"timestamp"')
      )
    })

    it("should prevent duplicate impression tracking for same ad", async () => {
      await trackAdEvent("ad-123", "impression")
      await trackAdEvent("ad-123", "impression")
      await trackAdEvent("ad-123", "impression")

      expect(mockSendBeacon).toHaveBeenCalledTimes(1)
    })

    it("should allow tracking impressions for different ads", async () => {
      await trackAdEvent("ad-123", "impression")
      await trackAdEvent("ad-456", "impression")

      expect(mockSendBeacon).toHaveBeenCalledTimes(2)
    })

    it("should allow tracking clicks even after impression", async () => {
      await trackAdEvent("ad-123", "impression")
      await trackAdEvent("ad-123", "click")

      expect(mockSendBeacon).toHaveBeenCalledTimes(2)
    })

    it("should allow multiple click tracking for same ad", async () => {
      await trackAdEvent("ad-123", "click")
      await trackAdEvent("ad-123", "click")

      expect(mockSendBeacon).toHaveBeenCalledTimes(2)
    })

    it("should fallback to fetch when sendBeacon is not available", async () => {
      Object.defineProperty(global, "navigator", {
        value: { sendBeacon: undefined },
        writable: true,
        configurable: true,
      })

      await trackAdEvent("ad-123", "click")

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/ads/track",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        })
      )
    })

    it("should handle fetch failure silently", async () => {
      Object.defineProperty(global, "navigator", {
        value: { sendBeacon: undefined },
        writable: true,
        configurable: true,
      })
      mockFetch.mockRejectedValue(new Error("Network error"))

      // Should not throw
      await expect(trackAdEvent("ad-123", "click")).resolves.toBeUndefined()
    })

    it("should handle sendBeacon errors silently", async () => {
      mockSendBeacon.mockImplementation(() => {
        throw new Error("sendBeacon error")
      })

      // Should not throw
      await expect(trackAdEvent("ad-123", "click")).resolves.toBeUndefined()
    })
  })

  describe("clearTrackedImpressions", () => {
    it("should clear all tracked impressions", async () => {
      await trackAdEvent("ad-123", "impression")
      await trackAdEvent("ad-456", "impression")

      expect(hasTrackedImpression("ad-123")).toBe(true)
      expect(hasTrackedImpression("ad-456")).toBe(true)

      clearTrackedImpressions()

      expect(hasTrackedImpression("ad-123")).toBe(false)
      expect(hasTrackedImpression("ad-456")).toBe(false)
    })

    it("should allow tracking impressions again after clearing", async () => {
      await trackAdEvent("ad-123", "impression")
      clearTrackedImpressions()
      await trackAdEvent("ad-123", "impression")

      expect(mockSendBeacon).toHaveBeenCalledTimes(2)
    })
  })

  describe("hasTrackedImpression", () => {
    it("should return false for untracked ad", () => {
      expect(hasTrackedImpression("ad-123")).toBe(false)
    })

    it("should return true for tracked ad", async () => {
      await trackAdEvent("ad-123", "impression")
      expect(hasTrackedImpression("ad-123")).toBe(true)
    })

    it("should return false after clearing", async () => {
      await trackAdEvent("ad-123", "impression")
      clearTrackedImpressions()
      expect(hasTrackedImpression("ad-123")).toBe(false)
    })
  })

  describe("getAnonymousUserId", () => {
    const mockLocalStorage: Record<string, string> = {}

    beforeEach(() => {
      // Mock window and localStorage
      Object.defineProperty(global, "window", {
        value: {},
        writable: true,
        configurable: true,
      })
      Object.defineProperty(global, "localStorage", {
        value: {
          getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
          setItem: vi.fn((key: string, value: string) => {
            mockLocalStorage[key] = value
          }),
        },
        writable: true,
        configurable: true,
      })
      // Clear mock storage
      for (const key of Object.keys(mockLocalStorage)) {
        delete mockLocalStorage[key]
      }
    })

    it("should return empty string on server side", () => {
      // Simulate server-side (no window)
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const result = getAnonymousUserId()
      expect(result).toBe("")
    })

    it("should return existing anonymous id from localStorage", () => {
      mockLocalStorage["ww_anonymous_id"] = "existing-id-123"

      const result = getAnonymousUserId()
      expect(result).toBe("existing-id-123")
    })

    it("should generate new id when not in localStorage", () => {
      const result = getAnonymousUserId()

      expect(result).toMatch(/^anon_\d+_[a-z0-9]+$/)
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "ww_anonymous_id",
        expect.stringMatching(/^anon_\d+_[a-z0-9]+$/)
      )
    })

    it("should return same id on multiple calls", () => {
      const id1 = getAnonymousUserId()
      mockLocalStorage["ww_anonymous_id"] = id1
      const id2 = getAnonymousUserId()

      expect(id1).toBe(id2)
    })
  })
})
