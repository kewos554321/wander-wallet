import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import type { AdPlacementType, AdType, AdStatus } from "@/types/ads"

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/admin/ads/[id] - 獲取單一廣告詳情
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const advertisement = await prisma.advertisement.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        placements: {
          orderBy: { position: "asc" },
        },
        analytics: {
          orderBy: { date: "desc" },
          take: 30, // 最近 30 天數據
        },
      },
    })

    if (!advertisement) {
      return NextResponse.json(
        { error: "找不到該廣告" },
        { status: 404 }
      )
    }

    return NextResponse.json(advertisement)
  } catch (error) {
    console.error("獲取廣告詳情錯誤:", error)
    return NextResponse.json(
      { error: "獲取廣告詳情失敗" },
      { status: 500 }
    )
  }
}

// PUT /api/admin/ads/[id] - 更新廣告
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await req.json()
    const {
      title,
      description,
      imageUrl,
      targetUrl,
      type,
      status,
      priority,
      startDate,
      endDate,
      targetImpressions,
      targetClicks,
      dailyBudget,
      placements,
    } = body as {
      title?: string
      description?: string | null
      imageUrl?: string | null
      targetUrl?: string
      type?: AdType
      status?: AdStatus
      priority?: number
      startDate?: string | null
      endDate?: string | null
      targetImpressions?: number | null
      targetClicks?: number | null
      dailyBudget?: number | null
      placements?: AdPlacementType[]
    }

    // 確認廣告存在
    const existing = await prisma.advertisement.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "找不到該廣告" },
        { status: 404 }
      )
    }

    // 驗證必填欄位（如果有提供）
    if (title !== undefined && !title?.trim()) {
      return NextResponse.json(
        { error: "廣告標題不能為空" },
        { status: 400 }
      )
    }
    if (targetUrl !== undefined && !targetUrl?.trim()) {
      return NextResponse.json(
        { error: "目標連結不能為空" },
        { status: 400 }
      )
    }

    // 使用 transaction 更新廣告和版位
    const advertisement = await prisma.$transaction(async (tx) => {
      // 更新廣告基本資料
      const updated = await tx.advertisement.update({
        where: { id },
        data: {
          ...(title !== undefined && { title: title.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(imageUrl !== undefined && { imageUrl }),
          ...(targetUrl !== undefined && { targetUrl: targetUrl.trim() }),
          ...(type !== undefined && { type }),
          ...(status !== undefined && { status }),
          ...(priority !== undefined && { priority }),
          ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
          ...(targetImpressions !== undefined && { targetImpressions }),
          ...(targetClicks !== undefined && { targetClicks }),
          ...(dailyBudget !== undefined && { dailyBudget }),
        },
      })

      // 如果有提供版位，更新版位配置
      if (placements !== undefined) {
        // 刪除現有版位
        await tx.adPlacement.deleteMany({
          where: { advertisementId: id },
        })

        // 建立新版位
        if (placements.length > 0) {
          await tx.adPlacement.createMany({
            data: placements.map((placement, index) => ({
              advertisementId: id,
              placement,
              position: index,
              isActive: true,
            })),
          })
        }
      }

      // 重新查詢完整資料
      return tx.advertisement.findUnique({
        where: { id },
        include: {
          placements: {
            orderBy: { position: "asc" },
          },
        },
      })
    })

    return NextResponse.json(advertisement)
  } catch (error) {
    console.error("更新廣告錯誤:", error)
    return NextResponse.json(
      { error: "更新廣告失敗" },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/ads/[id] - 部分更新廣告（例如狀態）
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await req.json()

    // 確認廣告存在
    const existing = await prisma.advertisement.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "找不到該廣告" },
        { status: 404 }
      )
    }

    // 只允許更新特定欄位
    const allowedFields = ["status", "priority"] as const
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "沒有可更新的欄位" },
        { status: 400 }
      )
    }

    const advertisement = await prisma.advertisement.update({
      where: { id },
      data: updateData,
      include: {
        placements: true,
      },
    })

    return NextResponse.json(advertisement)
  } catch (error) {
    console.error("部分更新廣告錯誤:", error)
    return NextResponse.json(
      { error: "更新廣告失敗" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/ads/[id] - 刪除廣告（軟刪除）
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    // 確認廣告存在
    const existing = await prisma.advertisement.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "找不到該廣告" },
        { status: 404 }
      )
    }

    // 軟刪除
    await prisma.advertisement.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "archived",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("刪除廣告錯誤:", error)
    return NextResponse.json(
      { error: "刪除廣告失敗" },
      { status: 500 }
    )
  }
}
