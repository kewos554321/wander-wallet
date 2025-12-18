import { NextRequest } from "next/server"
import { jwtVerify, SignJWT } from "jose"
import { prisma } from "@/lib/db"

// 開發模式檢測
const DEV_MODE = !process.env.NEXT_PUBLIC_LIFF_ID

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret-change-me"
)

// 開發模式的模擬用戶
const DEV_USER: AuthUser = {
  id: "00000000-0000-0000-0000-000000000001",
  lineUserId: "U1234567890dev",
  name: "開發測試用戶",
  image: null,
}

export interface AuthUser {
  id: string
  lineUserId: string
  name: string | null
  image: string | null
}

export interface JWTPayload {
  sub: string
  lineUserId: string
  name: string | null
  image: string | null
  iat: number
  exp: number
}

/**
 * 從請求的 Authorization header 驗證 JWT 並回傳用戶資訊
 */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.slice(7)

  // 開發模式：接受 dev-session-token
  if (DEV_MODE && token === "dev-session-token") {
    try {
      // 確保開發用戶存在於資料庫中
      let existingDevUser = await prisma.user.findUnique({
        where: { id: DEV_USER.id },
      })
      if (!existingDevUser) {
        // 檢查是否有相同 lineUserId 的用戶
        existingDevUser = await prisma.user.findUnique({
          where: { lineUserId: DEV_USER.lineUserId },
        })
        if (existingDevUser) {
          // 使用已存在的用戶
          return {
            id: existingDevUser.id,
            lineUserId: existingDevUser.lineUserId,
            name: existingDevUser.name,
            image: existingDevUser.image,
          }
        }
        // 創建新的開發用戶
        await prisma.user.create({
          data: {
            id: DEV_USER.id,
            lineUserId: DEV_USER.lineUserId,
            name: DEV_USER.name,
            image: DEV_USER.image,
          },
        })
      }
      return DEV_USER
    } catch (error) {
      console.error("Dev user setup error:", error)
      return DEV_USER
    }
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)

    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string },
      select: {
        id: true,
        lineUserId: true,
        name: true,
        image: true,
      },
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      lineUserId: user.lineUserId,
      name: user.name,
      image: user.image,
    }
  } catch (error) {
    console.error("JWT verification failed:", error)
    return null
  }
}

/**
 * 建立 JWT session token
 */
export async function createSessionToken(user: AuthUser): Promise<string> {
  const token = await new SignJWT({
    sub: user.id,
    lineUserId: user.lineUserId,
    name: user.name,
    image: user.image,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET)

  return token
}

/**
 * 驗證 LIFF access token (呼叫 LINE API)
 */
export async function verifyLiffAccessToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        access_token: accessToken,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("LINE token verification failed:", response.status, errorData)
    }

    return response.ok
  } catch (error) {
    console.error("Failed to verify LIFF access token:", error)
    return false
  }
}

/**
 * 從 LINE API 取得用戶資料
 */
export async function getLineProfile(accessToken: string): Promise<{
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
} | null> {
  try {
    const response = await fetch("https://api.line.me/v2/profile", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("LINE profile API failed:", response.status, errorData)
      return null
    }

    const profile = await response.json()
    return profile
  } catch (error) {
    console.error("Failed to get LINE profile:", error)
    return null
  }
}
