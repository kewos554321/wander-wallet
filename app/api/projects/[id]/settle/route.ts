import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface Balance {
  memberId: string
  displayName: string
  userImage: string | null
  balance: number // 正數表示應該收到錢，負數表示應該付錢
}

interface Settlement {
  from: {
    memberId: string
    displayName: string
    userImage: string | null
  }
  to: {
    memberId: string
    displayName: string
    userImage: string | null
  }
  amount: number
}

// 最優結算算法：最小化轉帳次數
function calculateOptimalSettlements(balances: Balance[]): Settlement[] {
  const settlements: Settlement[] = []

  // 深拷貝餘額物件，避免修改原始資料
  const balancesCopy = balances.map((b) => ({ ...b }))
  const debts: Balance[] = balancesCopy.filter((b) => b.balance < 0) // 欠錢的人
  const credits: Balance[] = balancesCopy.filter((b) => b.balance > 0) // 應該收錢的人

  // 簡化版本：貪心算法
  // 對於每個欠錢的人，找到應該收錢最多的人來結算
  const remainingDebts = [...debts]
  const remainingCredits = [...credits]

  while (remainingDebts.length > 0 && remainingCredits.length > 0) {
    // 找到欠錢最多的人
    remainingDebts.sort((a, b) => a.balance - b.balance)
    const debtor = remainingDebts[0]

    // 找到應該收錢最多的人
    remainingCredits.sort((a, b) => b.balance - a.balance)
    const creditor = remainingCredits[0]

    // 計算結算金額（取兩者絕對值的較小值）
    const amount = Math.min(Math.abs(debtor.balance), creditor.balance)

    settlements.push({
      from: {
        memberId: debtor.memberId,
        displayName: debtor.displayName,
        userImage: debtor.userImage,
      },
      to: {
        memberId: creditor.memberId,
        displayName: creditor.displayName,
        userImage: creditor.userImage,
      },
      amount: Math.round(amount * 100) / 100, // 保留兩位小數
    })

    // 更新餘額
    debtor.balance += amount
    creditor.balance -= amount

    // 移除已結清的記錄
    if (Math.abs(debtor.balance) < 0.01) {
      remainingDebts.shift()
    }
    if (Math.abs(creditor.balance) < 0.01) {
      remainingCredits.shift()
    }
  }

  return settlements
}

// 獲取專案的結算方案
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

    // 獲取所有費用
    const expenses = await prisma.expense.findMany({
      where: {
        projectId: id,
      },
      include: {
        payer: {
          select: {
            id: true,
            displayName: true,
            user: {
              select: {
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
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    // 獲取所有成員
    const members = await prisma.projectMember.findMany({
      where: {
        projectId: id,
      },
      include: {
        user: {
          select: {
            image: true,
          },
        },
      },
    })

    // 計算每個成員的餘額（使用 memberId，支援佔位成員）
    // balance = 已付款總額 - 應該分擔總額
    const balanceMap = new Map<string, Balance>()

    // 初始化所有成員的餘額為0（包括佔位成員）
    members.forEach((member) => {
      balanceMap.set(member.id, {
        memberId: member.id,
        displayName: member.displayName,
        userImage: member.user?.image || null,
        balance: 0,
      })
    })

    // 計算每個成員的淨支出
    expenses.forEach((expense) => {
      const paidAmount = Number(expense.amount)
      const payerBalance = balanceMap.get(expense.paidByMemberId)
      if (payerBalance) {
        payerBalance.balance += paidAmount // 付了錢，餘額增加
      }

      // 扣除每個參與者應該分擔的金額
      expense.participants.forEach((participant) => {
        const shareAmount = Number(participant.shareAmount)
        const participantBalance = balanceMap.get(participant.memberId)
        if (participantBalance) {
          participantBalance.balance -= shareAmount // 應該分擔，餘額減少
        }
      })
    })

    const balances = Array.from(balanceMap.values())
    const totalPaid = expenses.reduce(
      (sum: number, e) => sum + Number(e.amount),
      0
    )
    const totalShared = expenses.reduce(
      (sum: number, e) =>
        sum +
        e.participants.reduce(
          (pSum: number, p) => pSum + Number(p.shareAmount),
          0
        ),
      0
    )

    // 計算最優結算方案
    const settlements = calculateOptimalSettlements(balances)

    return NextResponse.json({
      balances,
      settlements,
      summary: {
        totalExpenses: expenses.length,
        totalAmount: totalPaid,
        totalShared,
        isBalanced: Math.abs(totalPaid - totalShared) < 0.01,
      },
    })
  } catch (error) {
    console.error("計算結算錯誤:", error)
    return NextResponse.json(
      { error: "計算結算失敗" },
      { status: 500 }
    )
  }
}
