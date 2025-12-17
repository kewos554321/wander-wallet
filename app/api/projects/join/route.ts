import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 通過專案 ID 或分享碼加入專案（一律建立新成員）
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 獲取用戶資料
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: "用戶不存在" }, { status: 401 })
    }

    const body = await req.json()
    const { projectId, shareCode } = body

    // 支援兩種方式：projectId 或 shareCode
    let project
    if (projectId) {
      project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: true,
        },
      })
    } else if (shareCode) {
      project = await prisma.project.findUnique({
        where: { shareCode: shareCode.toUpperCase().trim() },
        include: {
          members: true,
        },
      })
    } else {
      return NextResponse.json({ error: "專案 ID 或分享碼必填" }, { status: 400 })
    }

    if (!project) {
      return NextResponse.json({ error: "專案不存在" }, { status: 404 })
    }

    // 檢查是否已經是成員
    const isAlreadyMember = project.members.some(
      (member) => member.userId === authUser.id
    )

    if (isAlreadyMember) {
      return NextResponse.json({ id: project.id, alreadyMember: true }, { status: 200 })
    }

    // 建立新成員
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: authUser.id,
        displayName: user.name || user.lineUserId.slice(0, 8),
        role: "member",
        claimedAt: new Date(),
      },
    })

    return NextResponse.json({ id: project.id, joined: true }, { status: 201 })
  } catch (error) {
    console.error("加入專案錯誤:", error)
    return NextResponse.json(
      { error: "加入專案失敗" },
      { status: 500 }
    )
  }
}

