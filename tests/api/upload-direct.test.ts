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

describe("Upload Direct API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("POST /api/upload/direct", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(getAuthUser).mockResolvedValue(null)

      const formData = new FormData()
      formData.append("file", new Blob(["test"], { type: "image/jpeg" }), "test.jpg")
      formData.append("projectId", "proj-123")

      const req = new NextRequest("http://localhost:3000/api/upload/direct", {
        method: "POST",
        body: formData,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("未授權")
    })

    it("should return 400 if no file provided", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)

      const formData = new FormData()
      formData.append("projectId", "proj-123")

      const req = new NextRequest("http://localhost:3000/api/upload/direct", {
        method: "POST",
        body: formData,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("請選擇檔案")
    })

    it("should return 400 if no projectId provided", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)

      const formData = new FormData()
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" })
      formData.append("file", file)

      const req = new NextRequest("http://localhost:3000/api/upload/direct", {
        method: "POST",
        body: formData,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("專案 ID 必填")
    })

    it("should return 400 if file is not an image", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)

      const formData = new FormData()
      const file = new File(["test"], "test.txt", { type: "text/plain" })
      formData.append("file", file)
      formData.append("projectId", "proj-123")

      const req = new NextRequest("http://localhost:3000/api/upload/direct", {
        method: "POST",
        body: formData,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("僅支援圖片格式")
    })

    it("should upload JPEG image successfully", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)
      vi.mocked(generateFileKey).mockReturnValue("expense/proj-123/abc123")
      vi.mocked(uploadToR2).mockResolvedValue(undefined)
      vi.mocked(getPublicUrl).mockReturnValue("https://cdn.example.com/expense/proj-123/abc123.jpg")

      const formData = new FormData()
      const file = new File(["test image data"], "test.jpg", { type: "image/jpeg" })
      formData.append("file", file)
      formData.append("projectId", "proj-123")

      const req = new NextRequest("http://localhost:3000/api/upload/direct", {
        method: "POST",
        body: formData,
      })

      const response = await POST(req)
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

      const formData = new FormData()
      const file = new File(["test image data"], "test.png", { type: "image/png" })
      formData.append("file", file)
      formData.append("projectId", "proj-123")

      const req = new NextRequest("http://localhost:3000/api/upload/direct", {
        method: "POST",
        body: formData,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.key).toBe("expense/proj-123/abc123.png")
    })

    it("should upload WebP image successfully", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)
      vi.mocked(generateFileKey).mockReturnValue("expense/proj-123/abc123")
      vi.mocked(uploadToR2).mockResolvedValue(undefined)
      vi.mocked(getPublicUrl).mockReturnValue("https://cdn.example.com/expense/proj-123/abc123.webp")

      const formData = new FormData()
      const file = new File(["test"], "test.webp", { type: "image/webp" })
      formData.append("file", file)
      formData.append("projectId", "proj-123")

      const req = new NextRequest("http://localhost:3000/api/upload/direct", {
        method: "POST",
        body: formData,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.key).toBe("expense/proj-123/abc123.webp")
    })

    it("should upload GIF image successfully", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)
      vi.mocked(generateFileKey).mockReturnValue("expense/proj-123/abc123")
      vi.mocked(uploadToR2).mockResolvedValue(undefined)
      vi.mocked(getPublicUrl).mockReturnValue("https://cdn.example.com/expense/proj-123/abc123.gif")

      const formData = new FormData()
      const file = new File(["test"], "test.gif", { type: "image/gif" })
      formData.append("file", file)
      formData.append("projectId", "proj-123")

      const req = new NextRequest("http://localhost:3000/api/upload/direct", {
        method: "POST",
        body: formData,
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it("should use default jpg extension for unknown image type", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)
      vi.mocked(generateFileKey).mockReturnValue("expense/proj-123/abc123")
      vi.mocked(uploadToR2).mockResolvedValue(undefined)
      vi.mocked(getPublicUrl).mockReturnValue("https://cdn.example.com/expense/proj-123/abc123.jpg")

      const formData = new FormData()
      const file = new File(["test"], "test.bmp", { type: "image/bmp" })
      formData.append("file", file)
      formData.append("projectId", "proj-123")

      const req = new NextRequest("http://localhost:3000/api/upload/direct", {
        method: "POST",
        body: formData,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.key).toBe("expense/proj-123/abc123.jpg")
    })

    it("should use cover type when specified", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)
      vi.mocked(generateFileKey).mockReturnValue("cover/proj-123/abc123")
      vi.mocked(uploadToR2).mockResolvedValue(undefined)
      vi.mocked(getPublicUrl).mockReturnValue("https://cdn.example.com/cover/proj-123/abc123.jpg")

      const formData = new FormData()
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" })
      formData.append("file", file)
      formData.append("projectId", "proj-123")
      formData.append("type", "cover")

      const req = new NextRequest("http://localhost:3000/api/upload/direct", {
        method: "POST",
        body: formData,
      })

      await POST(req)

      expect(generateFileKey).toHaveBeenCalledWith("proj-123", "cover")
    })

    it("should return 500 on upload error", async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ id: "user-1" } as never)
      vi.mocked(generateFileKey).mockReturnValue("expense/proj-123/abc123")
      vi.mocked(uploadToR2).mockRejectedValue(new Error("Upload failed"))

      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

      const formData = new FormData()
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" })
      formData.append("file", file)
      formData.append("projectId", "proj-123")

      const req = new NextRequest("http://localhost:3000/api/upload/direct", {
        method: "POST",
        body: formData,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("上傳圖片失敗")

      consoleError.mockRestore()
    })
  })
})
