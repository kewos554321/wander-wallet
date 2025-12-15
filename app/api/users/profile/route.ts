import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function PUT(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { image, name } = body

    const updateData: { image?: string; name?: string } = {}

    if (image !== undefined) {
      // 驗證圖片格式：支援 base64 或自訂頭像格式 (avatar:icon:color)
      if (image && !image.startsWith("data:image/") && !image.startsWith("avatar:")) {
        return NextResponse.json({ error: "無效的圖片格式" }, { status: 400 })
      }
      updateData.image = image
    }

    if (name !== undefined) {
      updateData.name = name
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("更新用戶資料失敗:", error)
    return NextResponse.json({ error: "更新失敗" }, { status: 500 })
  }
}
