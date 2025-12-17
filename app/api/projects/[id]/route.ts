import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 獲取單個專案詳情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 先查詢專案基本資訊
    const project = await prisma.project.findUnique({
      where: { id },
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
                displayName: true,
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
            participants: {
              select: {
                id: true,
                memberId: true,
                shareAmount: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            expenses: true,
            members: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "專案不存在" }, { status: 404 })
    }

    // 檢查用戶是否為專案成員
    const isMember = project.members.some(
      (member) => member.userId === authUser.id
    )

    if (isMember) {
      // 是成員，返回完整資料
      return NextResponse.json({ ...project, isMember: true })
    } else {
      // 非成員，只返回基本資訊（用於加入流程）
      const unclaimedMembers = project.members
        .filter((member) => !member.userId)
        .map((member) => ({
          id: member.id,
          displayName: member.displayName,
        }))

      return NextResponse.json({
        id: project.id,
        name: project.name,
        description: project.description,
        isMember: false,
        unclaimedMembers,
        memberCount: project._count.members,
      })
    }
  } catch (error: unknown) {
    const prismaError = error as { message?: string; code?: string; meta?: unknown }
    console.error("獲取專案錯誤:", {
      message: prismaError?.message,
      code: prismaError?.code,
      meta: prismaError?.meta,
    })
    return NextResponse.json(
      {
        error: "獲取專案失敗",
        details: prismaError?.message,
        code: prismaError?.code,
      },
      { status: 500 }
    )
  }
}

// 更新專案
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 檢查用戶是否有權限（必須是專案成員）
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: authUser.id,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "無權限訪問此專案" }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, cover, startDate, endDate } = body

    const updateData: {
      name?: string
      description?: string | null
      cover?: string | null
      startDate?: Date | null
      endDate?: Date | null
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

    if (cover !== undefined) {
      updateData.cover = cover || null
    }

    // 處理日期更新
    let startDateObj: Date | null = null
    let endDateObj: Date | null = null

    if (startDate !== undefined) {
      if (startDate === null) {
        startDateObj = null
      } else {
        startDateObj = new Date(startDate)
        if (isNaN(startDateObj.getTime())) {
          return NextResponse.json({ error: "無效的出發日期" }, { status: 400 })
        }
      }
      updateData.startDate = startDateObj
    }

    if (endDate !== undefined) {
      if (endDate === null) {
        endDateObj = null
      } else {
        endDateObj = new Date(endDate)
        if (isNaN(endDateObj.getTime())) {
          return NextResponse.json({ error: "無效的結束日期" }, { status: 400 })
        }
      }
      updateData.endDate = endDateObj
    }

    // 驗證結束日期必須晚於出發日期
    const finalStartDate = startDateObj !== undefined ? startDateObj : undefined
    const finalEndDate = endDateObj !== undefined ? endDateObj : undefined
    
    if (finalStartDate && finalEndDate && finalEndDate < finalStartDate) {
      return NextResponse.json({ error: "結束日期需晚於出發日期" }, { status: 400 })
    }

    const project = await prisma.project.update({
      where: { id: id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    const project = await prisma.project.findUnique({
      where: { id: id },
    })

    if (!project) {
      return NextResponse.json({ error: "專案不存在" }, { status: 404 })
    }

    // 只有創建者可以刪除專案
    if (project.createdBy !== authUser.id) {
      return NextResponse.json({ error: "只有創建者可以刪除專案" }, { status: 403 })
    }

    await prisma.project.delete({
      where: { id: id },
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

