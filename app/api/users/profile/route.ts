import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)

  if (!authUser) {
    return NextResponse.json({ error: "未登入" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        lineUserId: true,
        name: true,
        email: true,
        image: true,
        preferences: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "用戶不存在" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("獲取用戶資料失敗:", error)
    return NextResponse.json({ error: "獲取失敗" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authUser = await getAuthUser(request)

  if (!authUser) {
    return NextResponse.json({ error: "未登入" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { image, name, preferences } = body

    const updateData: Prisma.UserUpdateInput = {}

    if (image !== undefined) {
      // 驗證圖片格式：支援 URL 或自訂頭像格式 (avatar:icon:color)
      if (image && !image.startsWith("http") && !image.startsWith("avatar:")) {
        return NextResponse.json({ error: "無效的圖片格式" }, { status: 400 })
      }
      updateData.image = image
    }

    if (name !== undefined) {
      updateData.name = name
    }

    if (preferences !== undefined) {
      // 驗證 preferences 結構
      if (typeof preferences !== "object" || preferences === null) {
        return NextResponse.json({ error: "無效的偏好設定格式" }, { status: 400 })
      }

      // 驗證 defaultSplitMode
      if (preferences.defaultSplitMode !== undefined) {
        if (!["equal", "custom"].includes(preferences.defaultSplitMode)) {
          return NextResponse.json({ error: "無效的分帳方式" }, { status: 400 })
        }
      }

      // 驗證 notifications
      if (preferences.notifications !== undefined) {
        if (typeof preferences.notifications !== "object") {
          return NextResponse.json({ error: "無效的通知設定格式" }, { status: 400 })
        }
      }

      updateData.preferences = preferences
    }

    const user = await prisma.user.update({
      where: { id: authUser.id },
      data: updateData,
      select: {
        id: true,
        lineUserId: true,
        name: true,
        image: true,
        preferences: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("更新用戶資料失敗:", error)
    return NextResponse.json({ error: "更新失敗" }, { status: 500 })
  }
}
