import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

interface Participant {
  userId: string
  shareAmount: number | string
}

// 獲取單個費用詳情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 檢查用戶是否為專案成員
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId: session.user.id,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "無權限訪問此專案" }, { status: 403 })
    }

    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        projectId: id,
      },
      include: {
        payer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        participants: {
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

    if (!expense) {
      return NextResponse.json({ error: "費用不存在" }, { status: 404 })
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error("獲取費用錯誤:", error)
    return NextResponse.json(
      { error: "獲取費用失敗" },
      { status: 500 }
    )
  }
}

// 更新費用
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 檢查用戶是否為專案成員
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId: session.user.id,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "無權限訪問此專案" }, { status: 403 })
    }

    const body = await req.json()
    const { paidBy, amount, description, category, participants } = body

    // 獲取現有費用
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        projectId: id,
      },
    })

    if (!existingExpense) {
      return NextResponse.json({ error: "費用不存在" }, { status: 404 })
    }

    // 驗證金額
    if (amount !== undefined) {
      const amountNum = Number(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        return NextResponse.json({ error: "金額必須大於0" }, { status: 400 })
      }
    }

    // 如果更新了參與者，需要重新驗證
    if (participants && Array.isArray(participants)) {
      const amountNum = amount !== undefined ? Number(amount) : Number(existingExpense.amount)
      
      if (participants.length === 0) {
        return NextResponse.json({ error: "至少需要一個參與者" }, { status: 400 })
      }

      // 驗證所有參與者都是專案成員
      const projectMembers = await prisma.projectMember.findMany({
        where: {
          projectId: id,
        },
        select: {
          userId: true,
        },
      })

      const memberIds = new Set(projectMembers.map((m: { userId: string }) => m.userId))
      const participantUserIds = participants.map((p: Participant) => p.userId)

      for (const userId of participantUserIds) {
        if (!memberIds.has(userId)) {
          return NextResponse.json(
            { error: `用戶 ${userId} 不是專案成員` },
            { status: 400 }
          )
        }
      }

      // 驗證分擔總額
      const totalShare = participants.reduce(
        (sum: number, p: Participant) => sum + Number(p.shareAmount || 0),
        0
      )

      if (Math.abs(totalShare - amountNum) > 0.01) {
        return NextResponse.json(
          { error: "分擔總額必須等於費用總額" },
          { status: 400 }
        )
      }
    }

    // 更新費用（如果需要更新參與者，先刪除舊的再創建新的）
    const updateData: {
      paidBy?: string
      amount?: number
      description?: string | null
      category?: string | null
    } = {}
    if (paidBy !== undefined) updateData.paidBy = paidBy
    if (amount !== undefined) updateData.amount = Number(amount)
    if (description !== undefined) updateData.description = description?.trim() || null
    if (category !== undefined) updateData.category = category?.trim() || null

    await prisma.$transaction(async (tx: typeof prisma) => {
      if (participants && Array.isArray(participants)) {
        // 刪除舊的參與者
        await tx.expenseParticipant.deleteMany({
          where: {
            expenseId: expenseId,
          },
        })

        // 創建新的參與者
        await tx.expenseParticipant.createMany({
          data: participants.map((p: Participant) => ({
            expenseId: expenseId,
            userId: p.userId,
            shareAmount: Number(p.shareAmount),
          })),
        })
      }

      // 更新費用
      if (Object.keys(updateData).length > 0) {
        await tx.expense.update({
          where: { id: expenseId },
          data: updateData,
        })
      }
    })

    // 返回更新後的費用
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        payer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        participants: {
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

    return NextResponse.json(expense)
  } catch (error) {
    console.error("更新費用錯誤:", error)
    return NextResponse.json(
      { error: "更新費用失敗" },
      { status: 500 }
    )
  }
}

// 刪除費用
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 檢查用戶是否為專案成員
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId: session.user.id,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "無權限訪問此專案" }, { status: 403 })
    }

    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        projectId: id,
      },
    })

    if (!expense) {
      return NextResponse.json({ error: "費用不存在" }, { status: 404 })
    }

    await prisma.expense.delete({
      where: { id: expenseId },
    })

    return NextResponse.json({ message: "費用已刪除" })
  } catch (error) {
    console.error("刪除費用錯誤:", error)
    return NextResponse.json(
      { error: "刪除費用失敗" },
      { status: 500 }
    )
  }
}

