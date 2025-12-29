import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createActivityLog } from "@/lib/activity-log"

// 批量刪除費用
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
    const { expenseIds } = body

    if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
      return NextResponse.json({ error: "請提供要刪除的費用 ID" }, { status: 400 })
    }

    // 驗證所有費用都屬於該專案（只取未刪除的）
    const expenses = await prisma.expense.findMany({
      where: {
        id: { in: expenseIds },
        projectId: id,
        deletedAt: null,
      },
      select: { id: true },
    })

    const validIds = expenses.map(e => e.id)

    if (validIds.length === 0) {
      return NextResponse.json({ error: "找不到可刪除的費用" }, { status: 404 })
    }

    // 批量軟刪除
    const result = await prisma.expense.updateMany({
      where: {
        id: { in: validIds },
        projectId: id,
      },
      data: {
        deletedAt: new Date(),
        deletedByMemberId: membership.id,
      },
    })

    // 記錄操作歷史
    await Promise.all(
      validIds.map((expenseId) =>
        createActivityLog({
          projectId: id,
          actorMemberId: membership.id,
          entityType: "expense",
          entityId: expenseId,
          action: "delete",
          changes: null,
        })
      )
    )

    return NextResponse.json({
      deleted: result.count,
      message: `已刪除 ${result.count} 筆費用`
    })
  } catch (error) {
    console.error("批量刪除費用錯誤:", error)
    return NextResponse.json(
      { error: "批量刪除費用失敗" },
      { status: 500 }
    )
  }
}
