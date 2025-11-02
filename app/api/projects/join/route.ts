import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

// 通過分享碼加入專案
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    const body = await req.json()
    const { shareCode } = body

    if (!shareCode || typeof shareCode !== "string") {
      return NextResponse.json({ error: "分享碼必填" }, { status: 400 })
    }

    // 查找專案
    const project = await prisma.project.findUnique({
      where: { shareCode: shareCode.toUpperCase().trim() },
      include: {
        members: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "無效的分享碼" }, { status: 404 })
    }

    // 檢查是否已經是成員
    const isAlreadyMember = project.members.some(
      (member) => member.userId === session.user.id
    )

    if (isAlreadyMember) {
      return NextResponse.json({ error: "您已經是此專案的成員" }, { status: 400 })
    }

    // 加入專案
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: session.user.id,
        role: "member",
      },
    })

    // 返回專案詳情
    const updatedProject = await prisma.project.findUnique({
      where: { id: project.id },
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

    return NextResponse.json(updatedProject, { status: 201 })
  } catch (error) {
    console.error("加入專案錯誤:", error)
    return NextResponse.json(
      { error: "加入專案失敗" },
      { status: 500 }
    )
  }
}

