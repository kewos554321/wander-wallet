import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 認領佔位旅伴
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    const body = await req.json()
    const { memberId } = body

    if (!memberId) {
      return NextResponse.json({ error: "旅伴ID必填" }, { status: 400 })
    }

    // 檢查旅程是否存在以及加入模式
    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return NextResponse.json({ error: "旅程不存在" }, { status: 404 })
    }

    // 檢查加入模式是否允許認領旅伴
    if (project.joinMode === "create_only") {
      return NextResponse.json(
        { error: "此旅程僅允許建立新旅伴，不支援認領佔位旅伴" },
        { status: 400 }
      )
    }

    // 檢查用戶是否已經是旅程旅伴（有綁定帳號的）
    const existingMembership = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: authUser.id,
      },
    })

    if (existingMembership) {
      return NextResponse.json({ error: "您已經是此旅程的旅伴，無法認領其他身份" }, { status: 400 })
    }

    // 取得要認領的旅伴
    const memberToClaim = await prisma.projectMember.findUnique({
      where: { id: memberId },
    })

    if (!memberToClaim) {
      return NextResponse.json({ error: "旅伴不存在" }, { status: 404 })
    }

    if (memberToClaim.projectId !== id) {
      return NextResponse.json({ error: "旅伴不屬於此旅程" }, { status: 400 })
    }

    if (memberToClaim.userId) {
      return NextResponse.json({ error: "此旅伴已被認領" }, { status: 400 })
    }

    // 獲取用戶資料
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: "用戶不存在" }, { status: 401 })
    }

    // 認領旅伴：更新 userId 和 claimedAt
    const claimedMember = await prisma.projectMember.update({
      where: { id: memberId },
      data: {
        userId: authUser.id,
        displayName: user.name || user.lineUserId.slice(0, 8),
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
    console.error("認領旅伴錯誤:", error)
    return NextResponse.json(
      { error: "認領旅伴失敗" },
      { status: 500 }
    )
  }
}
