import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

// Mock jose
vi.mock("jose", () => {
  const mockSign = vi.fn().mockResolvedValue("mock-jwt-token")
  return {
    jwtVerify: vi.fn(),
    SignJWT: class MockSignJWT {
      setProtectedHeader() { return this }
      setIssuedAt() { return this }
      setExpirationTime() { return this }
      sign() { return mockSign() }
    },
  }
})

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock fetch for LINE API
const mockFetch = vi.fn()
global.fetch = mockFetch

import { jwtVerify } from "jose"
import { prisma } from "@/lib/db"

describe("auth module", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("getAuthUser", () => {
    it("should return null if no authorization header", async () => {
      const { getAuthUser } = await import("@/lib/auth")
      const req = new NextRequest("http://localhost:3000/api/test")

      const result = await getAuthUser(req)
      expect(result).toBeNull()
    })

    it("should return null if authorization header is not Bearer", async () => {
      const { getAuthUser } = await import("@/lib/auth")
      const req = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: "Basic credentials",
        },
      })

      const result = await getAuthUser(req)
      expect(result).toBeNull()
    })

    it("should verify JWT and return user", async () => {
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: {
          sub: "user-123",
          lineUserId: "line-123",
          name: "Test User",
          image: null,
        },
        protectedHeader: { alg: "HS256" },
      } as never)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-123",
        lineUserId: "line-123",
        name: "Test User",
        image: null,
      } as never)

      const { getAuthUser } = await import("@/lib/auth")
      const req = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: "Bearer valid-jwt-token",
        },
      })

      const result = await getAuthUser(req)

      expect(result).toEqual({
        id: "user-123",
        lineUserId: "line-123",
        name: "Test User",
        image: null,
      })
    })

    it("should return null if user not found in database", async () => {
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: {
          sub: "user-123",
        },
        protectedHeader: { alg: "HS256" },
      } as never)

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const { getAuthUser } = await import("@/lib/auth")
      const req = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: "Bearer valid-jwt-token",
        },
      })

      const result = await getAuthUser(req)
      expect(result).toBeNull()
    })

    it("should return null on JWT verification error", async () => {
      vi.mocked(jwtVerify).mockRejectedValue(new Error("Invalid token"))

      const { getAuthUser } = await import("@/lib/auth")
      const req = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: "Bearer invalid-token",
        },
      })

      const result = await getAuthUser(req)
      expect(result).toBeNull()
    })
  })

  describe("createSessionToken", () => {
    it("should create a JWT token", async () => {
      const { createSessionToken } = await import("@/lib/auth")

      const user = {
        id: "user-123",
        lineUserId: "line-123",
        name: "Test User",
        image: null,
      }

      const token = await createSessionToken(user)
      expect(token).toBe("mock-jwt-token")
    })
  })

  describe("verifyLiffAccessToken", () => {
    it("should return true for valid token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      const { verifyLiffAccessToken } = await import("@/lib/auth")
      const result = await verifyLiffAccessToken("valid-access-token")

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.line.me/oauth2/v2.1/verify",
        expect.objectContaining({
          method: "POST",
        })
      )
    })

    it("should return false for invalid token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "invalid_token" }),
      })

      const { verifyLiffAccessToken } = await import("@/lib/auth")
      const result = await verifyLiffAccessToken("invalid-access-token")

      expect(result).toBe(false)
    })

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const { verifyLiffAccessToken } = await import("@/lib/auth")
      const result = await verifyLiffAccessToken("access-token")

      expect(result).toBe(false)
    })
  })

  describe("getLineProfile", () => {
    it("should return profile for valid token", async () => {
      const mockProfile = {
        userId: "U123456",
        displayName: "Test User",
        pictureUrl: "https://example.com/avatar.jpg",
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      })

      const { getLineProfile } = await import("@/lib/auth")
      const result = await getLineProfile("valid-access-token")

      expect(result).toEqual(mockProfile)
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.line.me/v2/profile",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer valid-access-token",
          },
        })
      )
    })

    it("should return null for invalid token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "invalid_token" }),
      })

      const { getLineProfile } = await import("@/lib/auth")
      const result = await getLineProfile("invalid-access-token")

      expect(result).toBeNull()
    })

    it("should return null on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const { getLineProfile } = await import("@/lib/auth")
      const result = await getLineProfile("access-token")

      expect(result).toBeNull()
    })

    it("should handle JSON parse error on failed response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Invalid JSON")),
      })

      const { getLineProfile } = await import("@/lib/auth")
      const result = await getLineProfile("bad-token")

      expect(result).toBeNull()
    })
  })

  describe("verifyLiffAccessToken additional cases", () => {
    it("should handle JSON parse error on failed response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Invalid JSON")),
      })

      const { verifyLiffAccessToken } = await import("@/lib/auth")
      const result = await verifyLiffAccessToken("bad-token")

      expect(result).toBe(false)
    })
  })
})
