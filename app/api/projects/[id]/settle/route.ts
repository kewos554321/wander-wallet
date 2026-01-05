import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { convertCurrency } from "@/lib/services/exchange-rate"

interface Balance {
  memberId: string
  displayName: string
  userImage: string | null
  balance: number // 正數表示應該收到錢，負數表示應該付錢
  totalPaid: number // 總付款金額
  totalShare: number // 總分攤金額
}

interface ExpenseDetail {
  id: string
  description: string
  amount: number
  currency: string
  convertedAmount: number // 轉換後的專案幣別金額
  payer: {
    memberId: string
    displayName: string
  }
  participants: {
    memberId: string
    displayName: string
    shareAmount: number
    convertedShareAmount: number
  }[]
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

// 根據精度四捨五入
function roundToPrecision(value: number, precision: number): number {
  const factor = Math.pow(10, precision)
  return Math.round(value * factor) / factor
}

// 最優結算算法：最小化轉帳次數
function calculateOptimalSettlements(balances: Balance[], precision: number = 2): Settlement[] {
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
      amount: roundToPrecision(amount, precision),
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

    // 獲取專案幣別、自訂匯率和精度設定
    const project = await prisma.project.findUnique({
      where: { id },
      select: { currency: true, customRates: true, exchangeRatePrecision: true },
    })

    const projectCurrency = project?.currency || DEFAULT_CURRENCY
    const customRates = (project?.customRates as Record<string, number> | null) || {}
    const precision = project?.exchangeRatePrecision ?? 2

    // 獲取所有費用（只取未刪除的）
    const expenses = await prisma.expense.findMany({
      where: {
        projectId: id,
        deletedAt: null,
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
        totalPaid: 0,
        totalShare: 0,
      })
    })

    // 收集所有不同幣別並即時換算
    const exchangeRatesUsed: Record<string, number> = {}
    const defaultRates: Record<string, number> = {} // 原始即時匯率
    const uniqueCurrencies = new Set<string>()

    expenses.forEach((expense) => {
      if (expense.currency && expense.currency !== projectCurrency) {
        uniqueCurrencies.add(expense.currency)
      }
    })

    // 預先獲取所有需要的匯率（優先使用自訂匯率）
    for (const currency of uniqueCurrencies) {
      const conversion = await convertCurrency(1, currency, projectCurrency)
      defaultRates[currency] = conversion.exchangeRate

      // 優先使用自訂匯率，否則使用即時匯率
      exchangeRatesUsed[currency] = customRates[currency] ?? conversion.exchangeRate
    }

    // 計算每個成員的淨支出（使用專案幣別計算的金額）
    let totalPaid = 0
    let totalShared = 0
    const expenseDetails: ExpenseDetail[] = []

    for (const expense of expenses) {
      // 即時換算
      const rate = expense.currency === projectCurrency
        ? 1
        : (exchangeRatesUsed[expense.currency] || 1)
      const paidAmount = roundToPrecision(Number(expense.amount) * rate, precision)

      totalPaid += paidAmount

      const payerBalance = balanceMap.get(expense.paidByMemberId)
      if (payerBalance) {
        payerBalance.balance += paidAmount // 付了錢，餘額增加
        payerBalance.totalPaid += paidAmount // 記錄總付款
      }

      // 記錄支出詳情
      const expenseDetail: ExpenseDetail = {
        id: expense.id,
        description: expense.description || "未命名支出",
        amount: Number(expense.amount),
        currency: expense.currency,
        convertedAmount: paidAmount,
        payer: {
          memberId: expense.paidByMemberId,
          displayName: expense.payer.displayName,
        },
        participants: [],
      }

      // 扣除每個參與者應該分擔的金額
      expense.participants.forEach((participant) => {
        const shareAmount = roundToPrecision(Number(participant.shareAmount) * rate, precision)
        totalShared += shareAmount
        const participantBalance = balanceMap.get(participant.memberId)
        if (participantBalance) {
          participantBalance.balance -= shareAmount // 應該分擔，餘額減少
          participantBalance.totalShare += shareAmount // 記錄總分攤
        }

        expenseDetail.participants.push({
          memberId: participant.memberId,
          displayName: participant.member.displayName,
          shareAmount: Number(participant.shareAmount),
          convertedShareAmount: shareAmount,
        })
      })

      expenseDetails.push(expenseDetail)
    }

    // 對餘額進行精度處理
    const balances = Array.from(balanceMap.values()).map(b => ({
      ...b,
      balance: roundToPrecision(b.balance, precision),
      totalPaid: roundToPrecision(b.totalPaid, precision),
      totalShare: roundToPrecision(b.totalShare, precision),
    }))

    // 計算最優結算方案
    const settlements = calculateOptimalSettlements(balances, precision)

    // 判斷哪些幣別使用了自訂匯率
    const usingCustomRates: Record<string, boolean> = {}
    for (const currency of Object.keys(exchangeRatesUsed)) {
      usingCustomRates[currency] = customRates[currency] !== undefined
    }
    const hasCustomRates = Object.values(usingCustomRates).some(Boolean)

    return NextResponse.json({
      balances,
      settlements,
      expenseDetails,
      summary: {
        totalExpenses: expenses.length,
        totalAmount: roundToPrecision(totalPaid, precision),
        totalShared: roundToPrecision(totalShared, precision),
        isBalanced: Math.abs(totalPaid - totalShared) < 0.01,
        currency: projectCurrency,
        precision,
        exchangeRatesUsed: Object.keys(exchangeRatesUsed).length > 0 ? exchangeRatesUsed : undefined,
        defaultRates: Object.keys(defaultRates).length > 0 ? defaultRates : undefined,
        usingCustomRates: Object.keys(usingCustomRates).length > 0 ? usingCustomRates : undefined,
        hasCustomRates,
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
