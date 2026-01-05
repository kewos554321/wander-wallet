import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock auth
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}))

// Mock r2
vi.mock("@/lib/r2", () => ({
  getUploadUrl: vi.fn(),
  generateFileKey: vi.fn(),
  getPublicUrl: vi.fn(),
  deleteFile: vi.fn(),
  extractKeyFromUrl: vi.fn(),
}))

import { POST, DELETE } from "@/app/api/upload/route"
import { getAuthUser } from "@/lib/auth"
import {
  getUploadUrl,
  generateFileKey,
  getPublicUrl,
  deleteFile,
  extractKeyFromUrl,
} from "@/lib/r2"

const mockUser = {
  id: "user-123",
  lineUserId: "line-123",
  name: "Test User",
  image: null,
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: JSON.stringify({
        projectId: "project-123",
        contentType: "image/jpeg",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 400 if projectId is missing", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: JSON.stringify({
        contentType: "image/jpeg",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("專案 ID 必填")
  })

  it("should return 400 if contentType is not image", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: JSON.stringify({
        projectId: "project-123",
        contentType: "application/pdf",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("僅支援圖片格式")
  })

  it("should return 400 if contentType is missing", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: JSON.stringify({
        projectId: "project-123",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("僅支援圖片格式")
  })

  it("should return upload URL for valid request", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(generateFileKey).mockReturnValue("project-123/expense/abc123")
    vi.mocked(getUploadUrl).mockResolvedValue("https://r2.example.com/upload")
    vi.mocked(getPublicUrl).mockReturnValue("https://cdn.example.com/file.jpg")

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: JSON.stringify({
        projectId: "project-123",
        contentType: "image/jpeg",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.uploadUrl).toBe("https://r2.example.com/upload")
    expect(data.publicUrl).toBe("https://cdn.example.com/file.jpg")
    expect(data.key).toContain(".jpg")
  })

  it("should use correct extension for image/png", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(generateFileKey).mockReturnValue("project-123/expense/abc123")
    vi.mocked(getUploadUrl).mockResolvedValue("https://r2.example.com/upload")
    vi.mocked(getPublicUrl).mockReturnValue("https://cdn.example.com/file.png")

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: JSON.stringify({
        projectId: "project-123",
        contentType: "image/png",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.key).toContain(".png")
  })

  it("should use correct extension for image/webp", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(generateFileKey).mockReturnValue("project-123/expense/abc123")
    vi.mocked(getUploadUrl).mockResolvedValue("https://r2.example.com/upload")
    vi.mocked(getPublicUrl).mockReturnValue("https://cdn.example.com/file.webp")

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: JSON.stringify({
        projectId: "project-123",
        contentType: "image/webp",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.key).toContain(".webp")
  })

  it("should use cover type when specified", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(generateFileKey).mockReturnValue("project-123/cover/abc123")
    vi.mocked(getUploadUrl).mockResolvedValue("https://r2.example.com/upload")
    vi.mocked(getPublicUrl).mockReturnValue("https://cdn.example.com/file.jpg")

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: JSON.stringify({
        projectId: "project-123",
        contentType: "image/jpeg",
        type: "cover",
      }),
    })
    await POST(req)

    expect(generateFileKey).toHaveBeenCalledWith("project-123", "cover")
  })

  it("should return 500 on error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(generateFileKey).mockImplementation(() => {
      throw new Error("Generation error")
    })

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: JSON.stringify({
        projectId: "project-123",
        contentType: "image/jpeg",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("取得上傳 URL 失敗")
  })
})

describe("DELETE /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/upload?url=https://example.com/image.jpg",
      { method: "DELETE" }
    )
    const response = await DELETE(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 400 if url is missing", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "DELETE",
    })
    const response = await DELETE(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("圖片 URL 必填")
  })

  it("should skip deletion for non-R2 URLs", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(extractKeyFromUrl).mockReturnValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/upload?url=https://external.com/image.jpg",
      { method: "DELETE" }
    )
    const response = await DELETE(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe("非 R2 圖片，跳過刪除")
    expect(deleteFile).not.toHaveBeenCalled()
  })

  it("should delete R2 file successfully", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(extractKeyFromUrl).mockReturnValue("project-123/expense/abc123.jpg")
    vi.mocked(deleteFile).mockResolvedValue(undefined)

    const req = new NextRequest(
      "http://localhost:3000/api/upload?url=https://r2.example.com/image.jpg",
      { method: "DELETE" }
    )
    const response = await DELETE(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(deleteFile).toHaveBeenCalledWith("project-123/expense/abc123.jpg")
  })

  it("should return 500 on delete error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(extractKeyFromUrl).mockReturnValue("key")
    vi.mocked(deleteFile).mockRejectedValue(new Error("Delete error"))

    const req = new NextRequest(
      "http://localhost:3000/api/upload?url=https://r2.example.com/image.jpg",
      { method: "DELETE" }
    )
    const response = await DELETE(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("刪除圖片失敗")
  })
})
