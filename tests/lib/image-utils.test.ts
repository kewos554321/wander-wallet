import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock debugLog
vi.mock("@/lib/debug", () => ({
  debugLog: vi.fn(),
}))

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

describe("image-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("getExifOrientation", () => {
    it("should export getExifOrientation function", async () => {
      const { getExifOrientation } = await import("@/lib/image-utils")
      expect(typeof getExifOrientation).toBe("function")
    })

    it("should return 1 for non-JPEG files", async () => {
      const { getExifOrientation } = await import("@/lib/image-utils")

      // Create a mock file that isn't JPEG
      const file = new File(["test"], "test.txt", { type: "text/plain" })

      const result = await getExifOrientation(file)
      expect(result).toBe(1) // Default orientation
    })

    it("should handle file read errors gracefully", async () => {
      const { getExifOrientation } = await import("@/lib/image-utils")

      // Create empty file
      const file = new File([], "empty.jpg", { type: "image/jpeg" })

      const result = await getExifOrientation(file)
      expect(result).toBe(1)
    })
  })

  describe("compressImage", () => {
    it("should export compressImage function", async () => {
      const { compressImage } = await import("@/lib/image-utils")
      expect(typeof compressImage).toBe("function")
    })
  })

  describe("compressImageToBlob", () => {
    it("should export compressImageToBlob function", async () => {
      const { compressImageToBlob } = await import("@/lib/image-utils")
      expect(typeof compressImageToBlob).toBe("function")
    })
  })

  describe("uploadImageToR2", () => {
    it("should export uploadImageToR2 function", async () => {
      const { uploadImageToR2 } = await import("@/lib/image-utils")
      expect(typeof uploadImageToR2).toBe("function")
    })
  })

  describe("UploadResult interface", () => {
    it("should define the expected shape", async () => {
      // Just verify the types compile correctly
      const result: import("@/lib/image-utils").UploadResult = {
        url: "https://example.com/image.jpg",
        key: "expense/proj-123/image.jpg",
      }
      expect(result.url).toBeDefined()
      expect(result.key).toBeDefined()
    })
  })

  describe("exports", () => {
    it("should export all required functions", async () => {
      const module = await import("@/lib/image-utils")
      expect(module.getExifOrientation).toBeDefined()
      expect(module.compressImage).toBeDefined()
      expect(module.compressImageToBlob).toBeDefined()
      expect(module.uploadImageToR2).toBeDefined()
    })
  })
})
