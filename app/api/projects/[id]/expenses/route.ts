import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface Participant {
  memberId: string
  shareAmount: number | string
}

// 獲取專案的所有費用
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

    const expenses = await prisma.expense.findMany({
      where: {
        projectId: id,
      },
      include: {
        payer: {
          select: {
            id: true,
            displayName: true,
            userId: true,
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
                userId: true,
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
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error("獲取費用列表錯誤:", error)
    return NextResponse.json(
      { error: "獲取費用列表失敗" },
      { status: 500 }
    )
  }
}

// 創建新費用
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    const { paidByMemberId, amount, description, category, participants, expenseDate } = body

    // 驗證必填欄位
    if (!paidByMemberId || !amount || !participants || !Array.isArray(participants)) {
      return NextResponse.json(
        { error: "付款人、金額和參與者必填" },
        { status: 400 }
      )
    }

    // 驗證金額
    const amountNum = Number(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "金額必須大於0" }, { status: 400 })
    }

    // 驗證參與者
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

    const memberIdSet = new Set(projectMembers.map((m: { id: string }) => m.id))
    const participantMemberIds = participants.map((p: Participant) => p.memberId)

    for (const memberId of participantMemberIds) {
      if (!memberIdSet.has(memberId)) {
        return NextResponse.json(
          { error: `成員 ${memberId} 不是專案成員` },
          { status: 400 }
        )
      }
    }

    // 驗證付款人也是專案成員
    if (!memberIdSet.has(paidByMemberId)) {
      return NextResponse.json(
        { error: "付款人必須是專案成員" },
        { status: 400 }
      )
    }

    // 計算分擔總額並驗證
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

    // 創建費用記錄
    const expense = await prisma.expense.create({
      data: {
        projectId: id,
        paidByMemberId,
        amount: amountNum,
        description: description?.trim() || null,
        category: category?.trim() || null,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        participants: {
          create: participants.map((p: Participant) => ({
            memberId: p.memberId,
            shareAmount: Number(p.shareAmount),
          })),
        },
      },
      include: {
        payer: {
          select: {
            id: true,
            displayName: true,
            userId: true,
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
                userId: true,
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

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error("創建費用錯誤:", error)
    return NextResponse.json(
      { error: "創建費用失敗" },
      { status: 500 }
    )
  }
}

