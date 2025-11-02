import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

interface Balance {
  userId: string
  userName: string
  userEmail: string
  balance: number // 正數表示應該收到錢，負數表示應該付錢
}

interface Settlement {
  from: {
    id: string
    name: string | null
    email: string
  }
  to: {
    id: string
    name: string | null
    email: string
  }
  amount: number
}

// 最優結算算法：最小化轉帳次數
function calculateOptimalSettlements(balances: Balance[]): Settlement[] {
  const settlements: Settlement[] = []
  const debts: Balance[] = balances.filter((b) => b.balance < 0) // 欠錢的人
  const credits: Balance[] = balances.filter((b) => b.balance > 0) // 應該收錢的人

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
        id: debtor.userId,
        name: debtor.userName,
        email: debtor.userEmail,
      },
      to: {
        id: creditor.userId,
        name: creditor.userName,
        email: creditor.userEmail,
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

    // 獲取所有費用
    const expenses = await prisma.expense.findMany({
      where: {
        projectId: id,
      },
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
    })

    // 獲取所有成員
    const members = await prisma.projectMember.findMany({
      where: {
        projectId: id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // 計算每個人的餘額
    // balance = 已付款總額 - 應該分擔總額
    const balanceMap = new Map<string, Balance>()

    // 初始化所有成員的餘額為0
    members.forEach((member: { userId: string; user: { name: string | null; email: string | null } }) => {
      balanceMap.set(member.userId, {
        userId: member.userId,
        userName: member.user.name || member.user.email?.split("@")[0] || "Unknown",
        userEmail: member.user.email || "",
        balance: 0,
      })
    })

    // 計算每個人的淨支出
    expenses.forEach((expense: { amount: number | string; paidBy: string; participants: Array<{ userId: string; shareAmount: number | string }> }) => {
      const paidAmount = Number(expense.amount)
      const payerBalance = balanceMap.get(expense.paidBy)!
      payerBalance.balance += paidAmount // 付了錢，餘額增加

      // 扣除每個參與者應該分擔的金額
      expense.participants.forEach((participant: { userId: string; shareAmount: number | string }) => {
        const shareAmount = Number(participant.shareAmount)
        const participantBalance = balanceMap.get(participant.userId)!
        participantBalance.balance -= shareAmount // 應該分擔，餘額減少
      })
    })

    const balances = Array.from(balanceMap.values())
    const totalPaid = expenses.reduce(
      (sum: number, e: { amount: number | string }) => sum + Number(e.amount),
      0
    )
    const totalShared = expenses.reduce(
      (sum: number, e: { participants: Array<{ shareAmount: number | string }> }) =>
        sum +
        e.participants.reduce(
          (pSum: number, p: { shareAmount: number | string }) => pSum + Number(p.shareAmount),
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

