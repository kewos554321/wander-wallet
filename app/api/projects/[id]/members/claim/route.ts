import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

// 認領佔位成員
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    const body = await req.json()
    const { memberId } = body

    if (!memberId) {
      return NextResponse.json({ error: "成員ID必填" }, { status: 400 })
    }

    // 檢查用戶是否已經是專案成員（有綁定帳號的）
    const existingMembership = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: session.user.id,
      },
    })

    if (existingMembership) {
      return NextResponse.json({ error: "您已經是此專案的成員，無法認領其他身份" }, { status: 400 })
    }

    // 取得要認領的成員
    const memberToClaim = await prisma.projectMember.findUnique({
      where: { id: memberId },
    })

    if (!memberToClaim) {
      return NextResponse.json({ error: "成員不存在" }, { status: 404 })
    }

    if (memberToClaim.projectId !== id) {
      return NextResponse.json({ error: "成員不屬於此專案" }, { status: 400 })
    }

    if (memberToClaim.userId) {
      return NextResponse.json({ error: "此成員已被認領" }, { status: 400 })
    }

    // 獲取用戶資料
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: "用戶不存在" }, { status: 401 })
    }

    // 認領成員：更新 userId 和 claimedAt
    const claimedMember = await prisma.projectMember.update({
      where: { id: memberId },
      data: {
        userId: session.user.id,
        displayName: user.name || user.email.split("@")[0],
        claimedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(claimedMember)
  } catch (error) {
    console.error("認領成員錯誤:", error)
    return NextResponse.json(
      { error: "認領成員失敗" },
      { status: 500 }
    )
  }
}
