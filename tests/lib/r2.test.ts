import { describe, it, expect, vi, beforeEach } from "vitest"

// Hoisted mock functions
const { mockSend, mockGetSignedUrl } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGetSignedUrl: vi.fn(),
}))

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class MockS3Client {
    send = mockSend
  },
  PutObjectCommand: class MockPutObjectCommand {
    constructor(public params: Record<string, unknown>) {}
  },
  DeleteObjectCommand: class MockDeleteObjectCommand {
    constructor(public params: Record<string, unknown>) {}
  },
}))

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: () => mockGetSignedUrl(),
}))

import {
  getUploadUrl,
  uploadToR2,
  getPublicUrl,
  generateFileKey,
  deleteFile,
  extractKeyFromUrl,
} from "@/lib/r2"

describe("lib/r2", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getUploadUrl", () => {
    it("should return signed URL for upload", async () => {
      mockGetSignedUrl.mockResolvedValue("https://signed-url.example.com/upload")

      const result = await getUploadUrl("test-key", "image/jpeg")

      expect(result).toBe("https://signed-url.example.com/upload")
    })
  })

  describe("uploadToR2", () => {
    it("should upload file to R2", async () => {
      mockSend.mockResolvedValue({})
      const buffer = Buffer.from("test content")

      await uploadToR2("test-key", buffer, "text/plain")

      expect(mockSend).toHaveBeenCalled()
    })
  })

  describe("getPublicUrl", () => {
    it("should return public URL for key", () => {
      const result = getPublicUrl("expense/project-123/12345-abc")

      // Returns PUBLIC_URL (from env) + / + key
      expect(result).toContain("expense/project-123/12345-abc")
    })
  })

  describe("generateFileKey", () => {
    it("should generate unique file key for expense", () => {
      const key1 = generateFileKey("project-123", "expense")
      const key2 = generateFileKey("project-123", "expense")

      expect(key1).toMatch(/^expense\/project-123\/\d+-[a-z0-9]+$/)
      expect(key2).toMatch(/^expense\/project-123\/\d+-[a-z0-9]+$/)
      expect(key1).not.toBe(key2)
    })

    it("should generate unique file key for cover", () => {
      const key = generateFileKey("project-456", "cover")

      expect(key).toMatch(/^cover\/project-456\/\d+-[a-z0-9]+$/)
    })

    it("should default to expense type", () => {
      const key = generateFileKey("project-789")

      expect(key).toMatch(/^expense\/project-789\//)
    })
  })

  describe("deleteFile", () => {
    it("should delete file from R2", async () => {
      mockSend.mockResolvedValue({})

      await deleteFile("expense/project-123/12345-abc")

      expect(mockSend).toHaveBeenCalled()
    })
  })

  describe("extractKeyFromUrl", () => {
    it("should return null for empty URL", () => {
      expect(extractKeyFromUrl("")).toBeNull()
    })

    it("should return null for invalid URL", () => {
      expect(extractKeyFromUrl("not-a-url")).toBeNull()
    })

    it("should extract key from R2 default URL", () => {
      const url = "https://pub-abc123def456.r2.dev/expense/project-123/12345-abc"
      const result = extractKeyFromUrl(url)

      expect(result).toBe("expense/project-123/12345-abc")
    })

    it("should extract expense key from path", () => {
      const url = "https://some-other-domain.com/expense/project-123/12345-abc"
      const result = extractKeyFromUrl(url)

      expect(result).toBe("expense/project-123/12345-abc")
    })

    it("should extract cover key from path", () => {
      const url = "https://example.com/cover/project-123/12345-abc"
      const result = extractKeyFromUrl(url)

      expect(result).toBe("cover/project-123/12345-abc")
    })

    it("should handle URL with query params", () => {
      const url = "https://pub-abc123.r2.dev/expense/project-123/file?signature=xyz"
      const result = extractKeyFromUrl(url)

      // The current implementation includes query params
      expect(result).toBe("expense/project-123/file?signature=xyz")
    })

    it("should return null for URL without expense or cover path", () => {
      const url = "https://example.com/other/path/file.jpg"
      const result = extractKeyFromUrl(url)

      expect(result).toBeNull()
    })
  })
})
