import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createActivityLog } from "@/lib/activity-log"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { Prisma } from "@prisma/client"
import { validateSplitDetail } from "@/lib/expense-split"
import { primaryPayerId, validatePayers, type PayerShare } from "@/lib/expense-payers"
import { expensePayersInclude } from "@/lib/expense-payers-include"
import { getExchangeRate } from "@/lib/services/exchange-rate"
import { resolveRate } from "@/lib/currency-conversion"
import { computeProjectAmounts, type ProjectAmountResult } from "@/lib/expense-project-amounts"

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
        deletedAt: null, // 只取未刪除的費用
      },
      include: {
        payers: expensePayersInclude,
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
    const { payers, amount, currency, exchangeRate, description, category, image, location, latitude, longitude, participants, expenseDate, splitDetail } = body

    // 獲取專案幣別與匯率設定
    const project = await prisma.project.findUnique({
      where: { id },
      select: { currency: true, customRates: true, rateSource: true },
    })

    if (!project) {
      return NextResponse.json({ error: "專案不存在" }, { status: 404 })
    }

    const expenseCurrency = currency || project.currency || DEFAULT_CURRENCY

    // 驗證必填欄位
    if (amount === undefined || amount === null || !participants || !Array.isArray(participants)) {
      return NextResponse.json(
        { error: "金額和參與者必填" },
        { status: 400 }
      )
    }

    // 驗證金額
    const amountNum = Number(amount)
    if (isNaN(amountNum) || amountNum < 0) {
      return NextResponse.json({ error: "金額不可為負數" }, { status: 400 })
    }

    // 外幣匯率必須為正數
    if (exchangeRate !== undefined && exchangeRate !== null && !(Number(exchangeRate) > 0)) {
      return NextResponse.json({ error: "匯率必須大於 0" }, { status: 400 })
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
        remainderDiscrepancy: true,
      },
    })

    const memberIdSet = new Set(projectMembers.map((m) => m.id))
    const participantMemberIds = participants.map((p: Participant) => p.memberId)

    for (const memberId of participantMemberIds) {
      if (!memberIdSet.has(memberId)) {
        return NextResponse.json(
          { error: `成員 ${memberId} 不是專案成員` },
          { status: 400 }
        )
      }
    }

    // 驗證付款人（多人，金額合計須等於支出總額）
    const payerValidation = validatePayers(payers, amountNum, memberIdSet)
    if (!payerValidation.ok) {
      return NextResponse.json({ error: payerValidation.error }, { status: 400 })
    }
    const validatedPayers: PayerShare[] = payerValidation.payers

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

    // Optional v2 split detail; must match the submitted shares
    let validatedSplitDetail = null
    if (splitDetail !== undefined && splitDetail !== null) {
      const result = validateSplitDetail(
        splitDetail,
        participants.map((p: Participant) => ({ memberId: p.memberId, shareAmount: Number(p.shareAmount) }))
      )
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      // Normalize a detail with no personal items and no custom shares (e.g.
      // {version:1, personalItems:{}, customShares:{}}) down to null instead
      // of storing a degenerate, functionally-empty splitDetail.
      const isEmpty =
        Object.keys(result.detail.personalItems).length === 0 && Object.keys(result.detail.customShares).length === 0
      validatedSplitDetail = isEmpty ? null : result.detail
    }

    const primaryPayer = primaryPayerId(validatedPayers)

    // 計算結算幣別金額（換算 + 整數分配 + 尾差帳）
    const projectCurrency = project.currency || DEFAULT_CURRENCY
    const customRates = (project.customRates as Record<string, number> | null) || {}
    const rateSource = (project.rateSource as "fixed" | "live") || "fixed"

    let snapshotRate: number | null = null
    let seedRate: number | null = null
    let projectAmounts: ProjectAmountResult | null = null

    if (expenseCurrency !== projectCurrency) {
      const providedRate =
        exchangeRate !== undefined && exchangeRate !== null ? Number(exchangeRate) : null
      const needsLive =
        providedRate == null && (rateSource === "live" || customRates[expenseCurrency] == null)
      let liveRate: number | null = null
      if (needsLive) {
        try {
          liveRate = await getExchangeRate(expenseCurrency, projectCurrency)
        } catch {
          liveRate = null
        }
      }
      const resolved = resolveRate({
        currency: expenseCurrency,
        projectCurrency,
        provided: providedRate,
        rateSource,
        customRate: customRates[expenseCurrency] ?? null,
        liveRate,
      })
      snapshotRate = resolved.rate
      if (resolved.shouldSeedFixed) seedRate = resolved.rate

      projectAmounts = computeProjectAmounts({
        amount: amountNum,
        currency: expenseCurrency,
        projectCurrency,
        rate: resolved.rate,
        participants: participants.map((p: Participant) => ({
          memberId: p.memberId,
          shareAmount: Number(p.shareAmount),
        })),
        payers: validatedPayers.map((p) => ({ memberId: p.memberId, amount: p.amount })),
        discrepancy: new Map(projectMembers.map((m) => [m.id, m.remainderDiscrepancy ?? 0])),
      })
    }

    const initialDiscrepancy = new Map(
      projectMembers.map((m) => [m.id, m.remainderDiscrepancy ?? 0])
    )

    // 創建費用記錄（結算幣別金額 + 匯率快照；與尾差帳同交易）
    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          projectId: id,
          amount: amountNum,
          currency: expenseCurrency,
          exchangeRate: snapshotRate,
          description: description?.trim() || null,
          category: category?.trim() || null,
          image: image || null,
          location: location?.trim() || null,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
          ...(validatedSplitDetail
            ? { splitDetail: validatedSplitDetail as unknown as Prisma.InputJsonValue }
            : {}),
          payers: {
            create: validatedPayers.map((p) => ({
              memberId: p.memberId,
              amount: p.amount,
              ...(projectAmounts
                ? {
                    amountProject: projectAmounts.payers.find((x) => x.memberId === p.memberId)
                      ?.amountProject,
                  }
                : {}),
            })),
          },
          participants: {
            create: participants.map((p: Participant) => ({
              memberId: p.memberId,
              shareAmount: Number(p.shareAmount),
              ...(projectAmounts
                ? {
                    shareAmountProject: projectAmounts.participants.find(
                      (x) => x.memberId === p.memberId
                    )?.shareAmountProject,
                  }
                : {}),
            })),
          },
        },
        include: {
          payers: expensePayersInclude,
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

      if (seedRate != null) {
        await tx.project.update({
          where: { id },
          data: { customRates: { ...customRates, [expenseCurrency]: seedRate } },
        })
      }

      if (projectAmounts) {
        for (const [memberId, value] of projectAmounts.discrepancy) {
          if ((initialDiscrepancy.get(memberId) ?? 0) !== value) {
            await tx.projectMember.update({
              where: { id: memberId },
              data: { remainderDiscrepancy: value },
            })
          }
        }
      }

      return created
    })

    const payerName = expense.payers.find((p) => p.memberId === primaryPayer)?.member.displayName
      ?? expense.payers[0]?.member.displayName
      ?? "未知"

    // 記錄操作歷史（包含 metadata 快照）
    await createActivityLog({
      projectId: id,
      actorMemberId: membership.id,
      entityType: "expense",
      entityId: expense.id,
      action: "create",
      changes: null,
      metadata: {
        description: expense.description,
        amount: Number(expense.amount),
        currency: expense.currency,
        category: expense.category,
        payerName,
        expenseDate: expense.expenseDate.toISOString(),
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
