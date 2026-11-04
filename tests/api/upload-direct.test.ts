import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock auth
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}))

// Mock R2
vi.mock("@/lib/r2", () => ({
  uploadToR2: vi.fn(),
  generateFileKey: vi.fn(),
  getPublicUrl: vi.fn(),
}))

import { getAuthUser } from "@/lib/auth"
import { uploadToR2, generateFileKey, getPublicUrl } from "@/lib/r2"
import { POST } from "@/app/api/upload/direct/route"

/**
 * jsdom's FormData/File are a different realm from the one undici's multipart
 * parser expects, so building a real NextRequest body fails before the route
 * runs. The route only reads `formData().get()` and `file.type/arrayBuffer()`,
 * so a tiny stand-in exercises the same logic without the realm mismatch.
 */
function requestWith(fields: Record<string, unknown>): NextRequest {
  return {
    formData: async () => ({
      get: (key: string) => fields[key] ?? null,
    }),
  } as unknown as NextRequest
}

function fakeImage(type: string) {
  return { type, arrayBuffer: async () => new ArrayBuffer(8) }
}

describe("Upload Direct API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("POST /api/upload/direct", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(getAuthUser).mockResolvedValue(null)

      const response = await POST(requestWith({ file: fakeImage("image/jpeg"), projectId: "proj-123" }))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("未授權")
    })

    it("should return 400 if no file provided", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)

      const response = await POST(requestWith({ projectId: "proj-123" }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("請選擇檔案")
    })

    it("should return 400 if no projectId provided", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)

      const response = await POST(requestWith({ file: fakeImage("image/jpeg") }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("專案 ID 必填")
    })

    it("should return 400 if file is not an image", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)

      const response = await POST(requestWith({ file: fakeImage("text/plain"), projectId: "proj-123" }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("僅支援圖片格式")
    })

    it("should upload JPEG image successfully", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)
      vi.mocked(generateFileKey).mockReturnValue("expense/proj-123/abc123")
      vi.mocked(uploadToR2).mockResolvedValue(undefined)
      vi.mocked(getPublicUrl).mockReturnValue("https://cdn.example.com/expense/proj-123/abc123.jpg")

      const response = await POST(requestWith({ file: fakeImage("image/jpeg"), projectId: "proj-123" }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.publicUrl).toBe("https://cdn.example.com/expense/proj-123/abc123.jpg")
      expect(data.key).toBe("expense/proj-123/abc123.jpg")
      expect(uploadToR2).toHaveBeenCalledWith(
        "expense/proj-123/abc123.jpg",
        expect.any(Buffer),
        "image/jpeg"
      )
    })

    it("should upload PNG image successfully", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)
      vi.mocked(generateFileKey).mockReturnValue("expense/proj-123/abc123")
      vi.mocked(uploadToR2).mockResolvedValue(undefined)
      vi.mocked(getPublicUrl).mockReturnValue("https://cdn.example.com/expense/proj-123/abc123.png")

      const response = await POST(requestWith({ file: fakeImage("image/png"), projectId: "proj-123" }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.key).toBe("expense/proj-123/abc123.png")
    })

    it("should upload WebP image successfully", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)
      vi.mocked(generateFileKey).mockReturnValue("expense/proj-123/abc123")
      vi.mocked(uploadToR2).mockResolvedValue(undefined)
      vi.mocked(getPublicUrl).mockReturnValue("https://cdn.example.com/expense/proj-123/abc123.webp")

      const response = await POST(requestWith({ file: fakeImage("image/webp"), projectId: "proj-123" }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.key).toBe("expense/proj-123/abc123.webp")
    })

    it("should upload GIF image successfully", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)
      vi.mocked(generateFileKey).mockReturnValue("expense/proj-123/abc123")
      vi.mocked(uploadToR2).mockResolvedValue(undefined)
      vi.mocked(getPublicUrl).mockReturnValue("https://cdn.example.com/expense/proj-123/abc123.gif")

      const response = await POST(requestWith({ file: fakeImage("image/gif"), projectId: "proj-123" }))

      expect(response.status).toBe(200)
    })

    it("should use default jpg extension for unknown image type", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)
      vi.mocked(generateFileKey).mockReturnValue("expense/proj-123/abc123")
      vi.mocked(uploadToR2).mockResolvedValue(undefined)
      vi.mocked(getPublicUrl).mockReturnValue("https://cdn.example.com/expense/proj-123/abc123.jpg")

      const response = await POST(requestWith({ file: fakeImage("image/bmp"), projectId: "proj-123" }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.key).toBe("expense/proj-123/abc123.jpg")
    })

    it("should use cover type when specified", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)
      vi.mocked(generateFileKey).mockReturnValue("cover/proj-123/abc123")
      vi.mocked(uploadToR2).mockResolvedValue(undefined)
      vi.mocked(getPublicUrl).mockReturnValue("https://cdn.example.com/cover/proj-123/abc123.jpg")

      await POST(requestWith({ file: fakeImage("image/jpeg"), projectId: "proj-123", type: "cover" }))

      expect(generateFileKey).toHaveBeenCalledWith("proj-123", "cover")
    })

    it("should return 500 on upload error", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)
      vi.mocked(generateFileKey).mockReturnValue("expense/proj-123/abc123")
      vi.mocked(uploadToR2).mockRejectedValue(new Error("Upload failed"))

      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

      const response = await POST(requestWith({ file: fakeImage("image/jpeg"), projectId: "proj-123" }))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("上傳圖片失敗")

      consoleError.mockRestore()
    })
  })
})
