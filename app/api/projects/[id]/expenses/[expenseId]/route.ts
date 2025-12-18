import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

interface Participant {
  memberId: string
  shareAmount: number | string
}

// 獲取單個費用詳情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 檢查用戶是否為專案成員
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: authUser.id,
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
            displayName: true,
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
        participants: {
          include: {
            member: {
              select: {
                id: true,
                displayName: true,
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
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 檢查用戶是否為專案成員
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
    const { paidByMemberId, amount, description, category, image, participants, expenseDate } = body

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
          id: true,
        },
      })

      const memberIds = new Set(projectMembers.map((m: { id: string }) => m.id))
      const participantMemberIds = participants.map((p: Participant) => p.memberId)

      for (const memberId of participantMemberIds) {
        if (!memberIds.has(memberId)) {
          return NextResponse.json(
            { error: `成員 ${memberId} 不是專案成員` },
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
      paidByMemberId?: string
      amount?: number
      description?: string | null
      category?: string | null
      image?: string | null
      expenseDate?: Date
    } = {}
    if (paidByMemberId !== undefined) updateData.paidByMemberId = paidByMemberId
    if (amount !== undefined) updateData.amount = Number(amount)
    if (description !== undefined) updateData.description = description?.trim() || null
    if (category !== undefined) updateData.category = category?.trim() || null
    if (image !== undefined) updateData.image = image || null
    if (expenseDate !== undefined) updateData.expenseDate = new Date(expenseDate)

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
            memberId: p.memberId,
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
            displayName: true,
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
        participants: {
          include: {
            member: {
              select: {
                id: true,
                displayName: true,
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
        },
      },
    })

    // 通知改由前端使用 LIFF sendMessages API 發送（以用戶身份）

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
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 檢查用戶是否為專案成員
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: authUser.id,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "無權限訪問此專案" }, { status: 403 })
    }

    // 獲取費用詳情（用於通知）
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        projectId: id,
      },
      include: {
        payer: {
          select: {
            displayName: true,
          },
        },
        participants: true,
      },
    })

    if (!expense) {
      return NextResponse.json({ error: "費用不存在" }, { status: 404 })
    }

    await prisma.expense.delete({
      where: { id: expenseId },
    })

    // 通知改由前端使用 LIFF sendMessages API 發送（以用戶身份）

    return NextResponse.json({ message: "費用已刪除" })
  } catch (error) {
    console.error("刪除費用錯誤:", error)
    return NextResponse.json(
      { error: "刪除費用失敗" },
      { status: 500 }
    )
  }
}

