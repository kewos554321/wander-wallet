import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

// 綁定 LINE 群組到專案
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: "未授權" }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const body = await req.json()
    const { lineGroupId } = body

    if (!lineGroupId || typeof lineGroupId !== "string") {
      return NextResponse.json({ error: "lineGroupId 必填" }, { status: 400 })
    }

    // 確認用戶是專案成員
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: user.id,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "無權限" }, { status: 403 })
    }

    // 更新專案的 LINE 群組 ID
    const project = await prisma.project.update({
      where: { id },
      data: { lineGroupId },
      select: {
        id: true,
        name: true,
        lineGroupId: true,
      },
    })

    return NextResponse.json({
      success: true,
      project,
    })
  } catch (error) {
    console.error("綁定群組錯誤:", error)
    return NextResponse.json({ error: "綁定群組失敗" }, { status: 500 })
  }
}
