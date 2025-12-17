import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 通過分享碼加入專案
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
    const { shareCode } = body

    if (!shareCode || typeof shareCode !== "string") {
      return NextResponse.json({ error: "分享碼必填" }, { status: 400 })
    }

    // 查找專案（包含完整資料以避免重複查詢）
    const project = await prisma.project.findUnique({
      where: { shareCode: shareCode.toUpperCase().trim() },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
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
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "無效的分享碼" }, { status: 404 })
    }

    // 檢查是否已經是成員（已綁定帳號的成員）
    const isAlreadyMember = project.members.some(
      (member: { userId: string | null }) => member.userId === authUser.id
    )

    // 如果已是成員，返回專案資訊讓前端直接跳轉
    if (isAlreadyMember) {
      return NextResponse.json({ id: project.id, alreadyMember: true }, { status: 200 })
    }

    // 加入專案並返回新成員資料
    const newMember = await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: authUser.id,
        displayName: user.name || user.lineUserId.slice(0, 8),
        role: "member",
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

    // 重用第一次查詢的資料，加入新成員後返回（避免重複查詢）
    const updatedProject = {
      ...project,
      members: [...project.members, newMember],
    }

    return NextResponse.json(updatedProject, { status: 201 })
  } catch (error) {
    console.error("加入專案錯誤:", error)
    return NextResponse.json(
      { error: "加入專案失敗" },
      { status: 500 }
    )
  }
}

