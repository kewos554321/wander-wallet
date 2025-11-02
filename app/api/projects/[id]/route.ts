import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

// 獲取單個專案詳情
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
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
        expenses: {
          include: {
            payer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "專案不存在或無權限訪問" }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("獲取專案錯誤:", error)
    return NextResponse.json(
      { error: "獲取專案失敗" },
      { status: 500 }
    )
  }
}

// 更新專案
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 檢查用戶是否有權限（必須是專案成員）
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: params.id,
          userId: session.user.id,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "無權限訪問此專案" }, { status: 403 })
    }

    const body = await req.json()
    const { name, description } = body

    const updateData: {
      name?: string
      description?: string | null
    } = {}

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json({ error: "專案名稱不能為空" }, { status: 400 })
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(project)
  } catch (error) {
    console.error("更新專案錯誤:", error)
    return NextResponse.json(
      { error: "更新專案失敗" },
      { status: 500 }
    )
  }
}

// 刪除專案（只有創建者可以刪除）
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
    })

    if (!project) {
      return NextResponse.json({ error: "專案不存在" }, { status: 404 })
    }

    // 只有創建者可以刪除專案
    if (project.createdBy !== session.user.id) {
      return NextResponse.json({ error: "只有創建者可以刪除專案" }, { status: 403 })
    }

    await prisma.project.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "專案已刪除" })
  } catch (error) {
    console.error("刪除專案錯誤:", error)
    return NextResponse.json(
      { error: "刪除專案失敗" },
      { status: 500 }
    )
  }
}

