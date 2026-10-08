import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { createActivityLog, createActivityLogInTransaction, diffChanges } from "@/lib/activity-log"
import { deleteFile, extractKeyFromUrl } from "@/lib/r2"
import { validateSplitDetail } from "@/lib/expense-split"
import { primaryPayerId, validatePayers } from "@/lib/expense-payers"
import { expensePayersInclude } from "@/lib/expense-payers-include"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { rollbackAllocation, resolveRate } from "@/lib/currency-conversion"
import { computeProjectAmounts } from "@/lib/expense-project-amounts"
import { getExchangeRate } from "@/lib/services/exchange-rate"

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
        payers: expensePayersInclude,
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
    const { payers, amount, currency, exchangeRate, description, category, image, location, latitude, longitude, participants, expenseDate, splitDetail } = body
    const hasSplitDetailField = Object.prototype.hasOwnProperty.call(body, "splitDetail")

    // 獲取現有費用（包含付款人和參與者資訊）
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        projectId: id,
        deletedAt: null, // 只取未刪除的費用
      },
      include: {
        payers: {
          include: {
            member: {
              select: {
                id: true,
                displayName: true,
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
              },
            },
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

    // 外幣匯率必須為正數
    if (exchangeRate !== undefined && exchangeRate !== null && !(Number(exchangeRate) > 0)) {
      return NextResponse.json({ error: "匯率必須大於 0" }, { status: 400 })
    }

    const effectiveAmount = amount !== undefined ? Number(amount) : Number(existingExpense.amount)

    // 驗證所有成員（用於付款人與參與者）
    const projectMembers = await prisma.projectMember.findMany({
      where: {
        projectId: id,
      },
      select: {
        id: true,
        remainderDiscrepancy: true,
      },
    })
    const memberIds = new Set(projectMembers.map((m) => m.id))

    // 如果更新了參與者，需要重新驗證
    if (participants && Array.isArray(participants)) {
      if (participants.length === 0) {
        return NextResponse.json({ error: "至少需要一個參與者" }, { status: 400 })
      }

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

      if (Math.abs(totalShare - effectiveAmount) > 0.01) {
        return NextResponse.json(
          { error: "分擔總額必須等於費用總額" },
          { status: 400 }
        )
      }
    }

    // 付款人（多人）：必須提供，且金額合計等於支出總額
    const payerValidation = validatePayers(payers, effectiveAmount, memberIds)
    if (!payerValidation.ok) {
      return NextResponse.json({ error: payerValidation.error }, { status: 400 })
    }
    const validatedPayers = payerValidation.payers
    const primaryPayer = primaryPayerId(validatedPayers)

    // splitDetail: explicit value wins; changed shares without it (old clients) clear it
    let splitDetailUpdate: Prisma.InputJsonValue | typeof Prisma.DbNull | undefined
    if (hasSplitDetailField) {
      if (splitDetail === null) {
        splitDetailUpdate = Prisma.DbNull
      } else {
        const shares = participants && Array.isArray(participants)
          ? participants.map((p: Participant) => ({ memberId: p.memberId, shareAmount: Number(p.shareAmount) }))
          : existingExpense.participants.map((p) => ({ memberId: p.member.id, shareAmount: Number(p.shareAmount) }))
        const result = validateSplitDetail(splitDetail, shares)
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        // Normalize a detail with no personal items and no custom shares down
        // to clearing the column, instead of persisting a degenerate,
        // functionally-empty splitDetail.
        const isEmpty =
          Object.keys(result.detail.personalItems).length === 0 && Object.keys(result.detail.customShares).length === 0
        splitDetailUpdate = isEmpty ? Prisma.DbNull : (result.detail as unknown as Prisma.InputJsonValue)
      }
    } else if (participants && Array.isArray(participants)) {
      splitDetailUpdate = Prisma.DbNull
    }

    // 更新費用（匯率轉換在結算時執行）
    const updateData: {
      amount?: number
      currency?: string
      exchangeRate?: number | null
      description?: string | null
      category?: string | null
      image?: string | null
      location?: string | null
      latitude?: number | null
      longitude?: number | null
      expenseDate?: Date
      splitDetail?: Prisma.InputJsonValue | typeof Prisma.DbNull
    } = {}
    if (amount !== undefined) updateData.amount = Number(amount)
    if (currency !== undefined) updateData.currency = currency
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
      ["amount", "currency", "description", "category", "location", "expenseDate"]
    )

    // Add splitDetail after diffChanges so it never pollutes the activity log
    if (splitDetailUpdate !== undefined) {
      updateData.splitDetail = splitDetailUpdate
    }

    // 計算結算幣別金額（含編輯回滾；與尾差帳同交易）
    const project = await prisma.project.findUnique({
      where: { id },
      select: { currency: true, customRates: true, rateSource: true },
    })
    const projectCurrency = project?.currency || existingExpense.currency || DEFAULT_CURRENCY
    const customRates = (project?.customRates as Record<string, number> | null) || {}
    const rateSource = (project?.rateSource as "fixed" | "live") || "fixed"

    const existingCurrency = existingExpense.currency || projectCurrency
    const newCurrency = currency !== undefined ? currency : existingCurrency
    const wasForeign = existingCurrency !== projectCurrency
    const isForeign = newCurrency !== projectCurrency

    const settlementParticipants =
      participants && Array.isArray(participants)
        ? participants.map((p: Participant) => ({ memberId: p.memberId, shareAmount: Number(p.shareAmount) }))
        : existingExpense.participants.map((p) => ({ memberId: p.member.id, shareAmount: Number(p.shareAmount) }))

    let newRate: number | null = null
    let seedRate: number | null = null
    if (isForeign) {
      const currencyChanged = currency !== undefined && currency !== existingCurrency
      const providedRate = exchangeRate !== undefined && exchangeRate !== null ? Number(exchangeRate) : null
      if (currencyChanged || providedRate != null || !existingExpense.exchangeRate) {
        const needsLive =
          providedRate == null && (rateSource === "live" || customRates[newCurrency] == null)
        let liveRate: number | null = null
        if (needsLive) {
          try {
            liveRate = await getExchangeRate(newCurrency, projectCurrency)
          } catch {
            liveRate = null
          }
        }
        const resolved = resolveRate({
          currency: newCurrency,
          projectCurrency,
          provided: providedRate,
          rateSource,
          customRate: customRates[newCurrency] ?? null,
          liveRate,
        })
        newRate = resolved.rate
        if (resolved.shouldSeedFixed) seedRate = resolved.rate
      } else {
        newRate = Number(existingExpense.exchangeRate)
      }
    }

    const hadAllocation =
      wasForeign ||
      existingExpense.participants.some((p) => p.shareAmountProject != null) ||
      existingExpense.payers.some((p) => p.amountProject != null)
    let ledger = new Map(projectMembers.map((m) => [m.id, m.remainderDiscrepancy ?? 0]))
    const ledgerInitial = new Map(ledger)
    if (hadAllocation) {
      const oldTotal =
        existingExpense.participants.reduce((s, p) => s + Number(p.shareAmountProject ?? 0), 0) ||
        existingExpense.payers.reduce((s, p) => s + Number(p.amountProject ?? 0), 0)
      ledger = rollbackAllocation(
        oldTotal,
        existingExpense.participants.map((p) => ({ id: p.member.id, weight: Number(p.shareAmount) })),
        new Map(existingExpense.participants.map((p) => [p.member.id, Number(p.shareAmountProject ?? 0)])),
        ledger,
      )
    }

    const projectAmounts = computeProjectAmounts({
      amount: effectiveAmount,
      currency: newCurrency,
      projectCurrency,
      rate: isForeign ? (newRate as number) : 1,
      participants: settlementParticipants,
      payers: validatedPayers.map((p) => ({ memberId: p.memberId, amount: p.amount })),
      discrepancy: ledger,
    })
    ledger = projectAmounts.discrepancy

    updateData.exchangeRate = isForeign ? newRate : null

    // 成員名稱映射（付款人顯示用）
    const memberNameMap: Record<string, string> = Object.fromEntries(
      existingExpense.payers.map((p) => [p.memberId, p.member.displayName])
    )
    const missingPayerIds = validatedPayers.map((p) => p.memberId).filter((id) => !memberNameMap[id])
    if (missingPayerIds.length > 0) {
      const members = await prisma.projectMember.findMany({
        where: { id: { in: missingPayerIds } },
        select: { id: true, displayName: true },
      })
      for (const m of members) memberNameMap[m.id] = m.displayName
    }

    const payerLabel = (list: { memberId: string; amount: unknown }[]) =>
      list.map((p) => `${memberNameMap[p.memberId] ?? "未知"} $${Number(p.amount)}`).join("、")

    const oldPayerKey = [...existingExpense.payers]
      .map((p) => `${p.memberId}:${Number(p.amount)}`)
      .sort()
      .join(",")
    const newPayerKey = validatedPayers
      .map((p) => `${p.memberId}:${p.amount}`)
      .sort()
      .join(",")

    let changesWithNames: Record<string, { from: unknown; to: unknown }> | null = changes ? { ...changes } : null

    // 付款人（可多人）有變更時記錄串接名稱
    if (oldPayerKey !== newPayerKey) {
      const payerChange = {
        from: payerLabel(existingExpense.payers),
        to: payerLabel(validatedPayers),
      }
      if (changesWithNames) changesWithNames.payers = payerChange
      else changesWithNames = { payers: payerChange }
    }

    // 計算參與者變更（具體顯示加入/移除的成員名稱）
    if (participants && Array.isArray(participants)) {
      const oldParticipantIds = new Set(existingExpense.participants.map(p => p.member.id))
      const newParticipantIds = new Set(participants.map((p: Participant) => p.memberId))

      // 找出加入和移除的成員
      const addedIds = [...newParticipantIds].filter(id => !oldParticipantIds.has(id))
      const removedIds = [...oldParticipantIds].filter(id => !newParticipantIds.has(id))

      // 只有在有變更時才記錄
      if (addedIds.length > 0 || removedIds.length > 0) {
        // 獲取所有相關成員的名稱
        const allMemberIds = [...addedIds, ...removedIds]
        const membersForParticipants = await prisma.projectMember.findMany({
          where: { id: { in: allMemberIds } },
          select: { id: true, displayName: true },
        })
        const participantNameMap = Object.fromEntries(membersForParticipants.map(m => [m.id, m.displayName]))

        // 舊成員名稱（從現有資料取得）
        const oldMemberNameMap = Object.fromEntries(
          existingExpense.participants.map(p => [p.member.id, p.member.displayName])
        )

        const addedNames = addedIds.map(id => participantNameMap[id] || id)
        const removedNames = removedIds.map(id => oldMemberNameMap[id] || participantNameMap[id] || id)

        // 建立變更記錄
        const participantsChange = {
          from: {
            count: oldParticipantIds.size,
            removed: removedNames,
          },
          to: {
            count: newParticipantIds.size,
            added: addedNames,
          },
        }

        if (changesWithNames) {
          changesWithNames.participants = participantsChange
        } else {
          changesWithNames = { participants: participantsChange }
        }
      }
    }

    // 取得新主要付款人名稱（活動紀錄 metadata）
    const activityPayerName = memberNameMap[primaryPayer] ?? "未知"

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (participants && Array.isArray(participants)) {
        // 刪除舊的參與者
        await tx.expenseParticipant.deleteMany({
          where: {
            expenseId: expenseId,
          },
        })

        // 創建新的參與者（含結算幣別金額）。`shareAmount` keeps the submitted
        // allocation weight; only the settlement amount is derived.
        await tx.expenseParticipant.createMany({
          data: participants.map((p: Participant) => ({
            expenseId: expenseId,
            memberId: p.memberId,
            shareAmount: Number(p.shareAmount),
            shareAmountProject: projectAmounts.participants.find((x) => x.memberId === p.memberId)
              ?.shareAmountProject,
          })),
        })
      } else {
        // 參與者未提供：重算結算幣別金額
        for (const p of existingExpense.participants) {
          await tx.expenseParticipant.update({
            where: { id: p.id },
            data: {
              shareAmountProject: projectAmounts.participants.find((x) => x.memberId === p.member.id)
                ?.shareAmountProject,
            },
          })
        }
      }

      // 重建付款人（含結算幣別金額）
      await tx.expensePayer.deleteMany({ where: { expenseId } })
      await tx.expensePayer.createMany({
        data: validatedPayers.map((p) => ({
          expenseId,
          memberId: p.memberId,
          amount: p.amount,
          amountProject: projectAmounts.payers.find((x) => x.memberId === p.memberId)?.amountProject,
        })),
      })

      // 更新費用
      await tx.expense.update({
        where: { id: expenseId },
        data: updateData,
      })

      if (seedRate != null) {
        await tx.project.update({
          where: { id },
          data: { customRates: { ...customRates, [newCurrency]: seedRate } },
        })
      }

      // 尾差帳（回滾舊 + 套用新）
      for (const [memberId, value] of ledger) {
        if ((ledgerInitial.get(memberId) ?? 0) !== value) {
          await tx.projectMember.update({
            where: { id: memberId },
            data: { remainderDiscrepancy: value },
          })
        }
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
            payerName: activityPayerName,
            expenseDate: (updateData.expenseDate || existingExpense.expenseDate).toISOString(),
          },
        })
      }
    })

    // 返回更新後的費用
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        payers: expensePayersInclude,
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
        payers: {
          include: {
            member: {
              select: {
                displayName: true,
              },
            },
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

    // 刪除費用：回滾尾差帳（外幣或任何已寫入結算金額的費用）
    const deleteProject = await prisma.project.findUnique({
      where: { id },
      select: { currency: true },
    })
    const deleteProjectCurrency = deleteProject?.currency || expense.currency || DEFAULT_CURRENCY
    const deleteExpenseCurrency = expense.currency || deleteProjectCurrency
    const deleteHadAllocation =
      deleteExpenseCurrency !== deleteProjectCurrency ||
      expense.participants.some((p) => p.shareAmountProject != null) ||
      expense.payers.some((p) => p.amountProject != null)
    if (deleteHadAllocation) {
      const oldTotal =
        expense.participants.reduce((s, p) => s + Number(p.shareAmountProject ?? 0), 0) ||
        expense.payers.reduce((s, p) => s + Number(p.amountProject ?? 0), 0)
      const members = await prisma.projectMember.findMany({
        where: { projectId: id },
        select: { id: true, remainderDiscrepancy: true },
      })
      let ledger = new Map(members.map((m) => [m.id, m.remainderDiscrepancy ?? 0]))
      const initial = new Map(ledger)
      ledger = rollbackAllocation(
        oldTotal,
        expense.participants.map((p) => ({ id: p.memberId, weight: Number(p.shareAmount) })),
        new Map(expense.participants.map((p) => [p.memberId, Number(p.shareAmountProject ?? 0)])),
        ledger,
      )
      for (const [memberId, value] of ledger) {
        if ((initial.get(memberId) ?? 0) !== value) {
          await prisma.projectMember.update({
            where: { id: memberId },
            data: { remainderDiscrepancy: value },
          })
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

    const payerName = primaryPayerId(
      expense.payers.map((p) => ({ memberId: p.memberId, amount: Number(p.amount) }))
    )
    const primaryName = expense.payers.find((p) => p.memberId === payerName)?.member.displayName
      ?? expense.payers[0]?.member.displayName
      ?? "未知"

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
        payerName: primaryName,
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
