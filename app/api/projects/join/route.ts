import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 加入旅程
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    const body = await req.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json({ error: "旅程 ID 必填" }, { status: 400 })
    }

    // 檢查旅程是否存在
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json({ error: "旅程不存在" }, { status: 404 })
    }

    // 檢查加入模式是否允許建立新旅伴
    if (project.joinMode === "claim_only") {
      return NextResponse.json(
        { error: "此旅程僅允許認領現有佔位旅伴，請選擇一位旅伴進行認領" },
        { status: 400 }
      )
    }

    // 檢查用戶是否已經是旅伴
    const existingMembership = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: authUser.id,
      },
    })

    if (existingMembership) {
      return NextResponse.json({ error: "您已經是此旅程的旅伴" }, { status: 400 })
    }

    // 獲取用戶資料以取得顯示名稱
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "用戶不存在" }, { status: 404 })
    }

    // 使用用戶名稱或 email 作為顯示名稱
    const displayName = user.name || user.email?.split("@")[0] || "旅伴"

    // 建立旅伴記錄
    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: authUser.id,
        displayName,
        role: "member",
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

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error("加入旅程錯誤:", error)
    return NextResponse.json(
      { error: "加入旅程失敗" },
      { status: 500 }
    )
  }
}
