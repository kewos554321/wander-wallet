import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { cn, getProjectShareUrl, getShareBaseUrl } from "@/lib/utils"

describe("cn (className utility)", () => {
  it("should merge class names correctly", () => {
    const result = cn("px-4", "py-2")
    expect(result).toBe("px-4 py-2")
  })

  it("should handle conditional classes", () => {
    const isActive = true
    const result = cn("base-class", isActive && "active-class")
    expect(result).toBe("base-class active-class")
  })

  it("should filter out falsy values", () => {
    const result = cn("class-a", false && "class-b", null, undefined, "class-c")
    expect(result).toBe("class-a class-c")
  })

  it("should merge tailwind classes correctly (last wins)", () => {
    const result = cn("px-2 py-4", "px-4")
    expect(result).toBe("py-4 px-4")
  })

  it("should handle empty inputs", () => {
    const result = cn()
    expect(result).toBe("")
  })

  it("should handle object syntax", () => {
    const result = cn({
      "text-red-500": true,
      "text-blue-500": false,
    })
    expect(result).toBe("text-red-500")
  })

  it("should handle array syntax", () => {
    const result = cn(["class-a", "class-b"])
    expect(result).toBe("class-a class-b")
  })
})

describe("getShareBaseUrl", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("should return LIFF URL when set", () => {
    process.env.NEXT_PUBLIC_LIFF_URL = "https://liff.line.me/123456"
    const result = getShareBaseUrl()
    expect(result).toBe("https://liff.line.me/123456")
  })

  it("should return window.location.origin when LIFF URL not set in browser", () => {
    delete process.env.NEXT_PUBLIC_LIFF_URL
    // 在 jsdom 環境下 window 存在，會回傳 window.location.origin
    const result = getShareBaseUrl()
    expect(result).toBe(window.location.origin)
  })
})

describe("getProjectShareUrl", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.NEXT_PUBLIC_LIFF_URL = "https://liff.line.me/123456"
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("should generate correct share URL with project ID", () => {
    const projectId = "project-abc-123"
    const result = getProjectShareUrl(projectId)
    expect(result).toBe("https://liff.line.me/123456/projects/project-abc-123")
  })

  it("should handle UUID project IDs", () => {
    const projectId = "550e8400-e29b-41d4-a716-446655440000"
    const result = getProjectShareUrl(projectId)
    expect(result).toBe("https://liff.line.me/123456/projects/550e8400-e29b-41d4-a716-446655440000")
  })

  it("should not include share code in URL", () => {
    const projectId = "project-123"
    const result = getProjectShareUrl(projectId)
    expect(result).not.toContain("code=")
    expect(result).not.toContain("join")
  })
})
