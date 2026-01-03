import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { createActivityLog, createActivityLogInTransaction, diffChanges } from "@/lib/activity-log"
import { deleteFile, extractKeyFromUrl } from "@/lib/r2"

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
        deletedAt: null, // 只取未刪除的費用
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
    const { paidByMemberId, amount, description, category, image, location, latitude, longitude, participants, expenseDate } = body

    // 獲取現有費用（包含付款人資訊）
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        projectId: id,
        deletedAt: null, // 只取未刪除的費用
      },
      include: {
        payer: {
          select: {
            displayName: true,
          },
        },
      },
    })

    if (!existingExpense) {
      return NextResponse.json({ error: "費用不存在" }, { status: 404 })
    }

    // 驗證金額
    if (amount !== undefined) {
      const amountNum = Number(amount)
      if (isNaN(amountNum) || amountNum < 0) {
        return NextResponse.json({ error: "金額不可為負數" }, { status: 400 })
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
      location?: string | null
      latitude?: number | null
      longitude?: number | null
      expenseDate?: Date
    } = {}
    if (paidByMemberId !== undefined) updateData.paidByMemberId = paidByMemberId
    if (amount !== undefined) updateData.amount = Number(amount)
    if (description !== undefined) updateData.description = description?.trim() || null
    if (category !== undefined) updateData.category = category?.trim() || null
    if (image !== undefined) updateData.image = image || null
    if (location !== undefined) updateData.location = location?.trim() || null
    if (latitude !== undefined) updateData.latitude = latitude ? Number(latitude) : null
    if (longitude !== undefined) updateData.longitude = longitude ? Number(longitude) : null
    if (expenseDate !== undefined) updateData.expenseDate = new Date(expenseDate)

    // 計算變更差異
    const changes = diffChanges(
      existingExpense as unknown as Record<string, unknown>,
      updateData as unknown as Record<string, unknown>,
      ["paidByMemberId", "amount", "description", "category", "location", "expenseDate"]
    )

    // 如果付款人有變更，獲取成員名稱映射
    let memberNameMap: Record<string, string> = {}
    if (changes?.paidByMemberId) {
      const memberIds = [changes.paidByMemberId.from, changes.paidByMemberId.to].filter(Boolean) as string[]
      const members = await prisma.projectMember.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, displayName: true },
      })
      memberNameMap = Object.fromEntries(members.map(m => [m.id, m.displayName]))
    }

    // 將 paidByMemberId 變更轉換為名稱顯示
    const changesWithNames = changes ? {
      ...changes,
      ...(changes.paidByMemberId && {
        paidByMemberId: {
          from: memberNameMap[changes.paidByMemberId.from as string] || changes.paidByMemberId.from,
          to: memberNameMap[changes.paidByMemberId.to as string] || changes.paidByMemberId.to,
        }
      })
    } : null

    // 獲取新的付款人名稱（如果有變更）
    let newPayerName = existingExpense.payer.displayName
    if (paidByMemberId && paidByMemberId !== existingExpense.paidByMemberId) {
      const newPayer = await prisma.projectMember.findUnique({
        where: { id: paidByMemberId },
        select: { displayName: true },
      })
      if (newPayer) {
        newPayerName = newPayer.displayName
      }
    }

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

      // 記錄操作歷史（包含 metadata 快照）
      if (changesWithNames || (participants && Array.isArray(participants))) {
        await createActivityLogInTransaction(tx, {
          projectId: id,
          actorMemberId: membership.id,
          entityType: "expense",
          entityId: expenseId,
          action: "update",
          changes: changesWithNames,
          metadata: {
            description: updateData.description !== undefined ? updateData.description : existingExpense.description,
            amount: updateData.amount !== undefined ? updateData.amount : Number(existingExpense.amount),
            category: updateData.category !== undefined ? updateData.category : existingExpense.category,
            payerName: newPayerName,
            expenseDate: (updateData.expenseDate || existingExpense.expenseDate).toISOString(),
          },
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

    // 獲取費用詳情
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        projectId: id,
        deletedAt: null, // 只取未刪除的費用
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

    // 如果有 R2 圖片，刪除
    if (expense.image) {
      const key = extractKeyFromUrl(expense.image)
      if (key) {
        try {
          await deleteFile(key)
        } catch (error) {
          console.error("刪除 R2 圖片失敗:", error)
          // 繼續執行，不影響費用刪除
        }
      }
    }

    // 軟刪除：更新 deletedAt 和 deletedByMemberId
    await prisma.expense.update({
      where: { id: expenseId },
      data: {
        deletedAt: new Date(),
        deletedByMemberId: membership.id,
      },
    })

    // 記錄操作歷史（包含被刪除費用的 metadata 快照）
    await createActivityLog({
      projectId: id,
      actorMemberId: membership.id,
      entityType: "expense",
      entityId: expenseId,
      action: "delete",
      changes: null,
      metadata: {
        description: expense.description,
        amount: Number(expense.amount),
        category: expense.category,
        payerName: expense.payer.displayName,
        expenseDate: expense.expenseDate.toISOString(),
      },
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

