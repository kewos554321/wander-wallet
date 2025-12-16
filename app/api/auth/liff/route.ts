import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createSessionToken, getLineProfile, verifyLiffAccessToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    // 處理空 body 的情況
    const text = await req.text()
    if (!text) {
      console.error("LIFF auth: Empty request body")
      return NextResponse.json(
        { error: "Request body is empty" },
        { status: 400 }
      )
    }

    let body: { accessToken?: string }
    try {
      body = JSON.parse(text)
    } catch {
      console.error("LIFF auth: Invalid JSON body:", text)
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      )
    }

    const { accessToken } = body

    if (!accessToken) {
      console.error("LIFF auth: Missing accessToken in body:", body)
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      )
    }

    // 直接用 access token 取得 LINE 用戶資料（同時驗證 token 有效性）
    console.log("Getting LINE profile with access token...")
    const profile = await getLineProfile(accessToken)
    if (!profile) {
      console.error("Failed to get LINE profile - token may be invalid")
      return NextResponse.json(
        { error: "Invalid access token or failed to get LINE profile" },
        { status: 401 }
      )
    }
    console.log("LINE profile received:", profile.userId)

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
