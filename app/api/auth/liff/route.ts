import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createSessionToken, getLineProfile, verifyLiffAccessToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json()

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      )
    }

    // 驗證 LIFF access token
    const isValid = await verifyLiffAccessToken(accessToken)
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid access token" },
        { status: 401 }
      )
    }

    // 取得 LINE 用戶資料
    const profile = await getLineProfile(accessToken)
    if (!profile) {
      return NextResponse.json(
        { error: "Failed to get LINE profile" },
        { status: 401 }
      )
    }

    // 查找或建立用戶
    let user = await prisma.user.findUnique({
      where: { lineUserId: profile.userId },
    })

    if (!user) {
      // 建立新用戶
      user = await prisma.user.create({
        data: {
          lineUserId: profile.userId,
          name: profile.displayName,
          image: profile.pictureUrl,
        },
      })
    } else {
      // 更新用戶資料（LINE 用戶可能會更新頭像或名稱）
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: profile.displayName,
          image: profile.pictureUrl,
        },
      })
    }

    // 建立 JWT session token
    const sessionToken = await createSessionToken({
      id: user.id,
      lineUserId: user.lineUserId,
      name: user.name,
      image: user.image,
    })

    return NextResponse.json({
      user: {
        id: user.id,
        lineUserId: user.lineUserId,
        name: user.name,
        image: user.image,
      },
      sessionToken,
    })
  } catch (error) {
    console.error("LIFF auth error:", error)
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    )
  }
}
