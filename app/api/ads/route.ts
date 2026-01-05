import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import type { AdPlacementType } from "@/types/ads"

// GET /api/ads - 獲取指定版位的廣告
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const placement = searchParams.get("placement") as AdPlacementType

    // 如果沒有 placement 參數或無效，直接返回空廣告（不報錯）
    const validPlacements: AdPlacementType[] = [
      "home",
      "project-list",
      "expense-list",
      "settle",
    ]

    if (!placement || !validPlacements.includes(placement)) {
      return NextResponse.json({ ad: null, placement: placement || "unknown" })
    }

    const now = new Date()

    // 查詢符合條件的廣告
    // 1. 狀態為 active
    // 2. 有對應版位配置且啟用
    // 3. 在排程時間範圍內（或無排程限制）
    // 4. 未被軟刪除
    const adPlacement = await prisma.adPlacement.findFirst({
      where: {
        placement: placement,
        isActive: true,
        advertisement: {
          status: "active",
          deletedAt: null,
          OR: [
            // 無排程限制
            {
              startDate: null,
              endDate: null,
            },
            // 只有開始時間
            {
              startDate: { lte: now },
              endDate: null,
            },
            // 只有結束時間
            {
              startDate: null,
              endDate: { gte: now },
            },
            // 有完整時間範圍
            {
              startDate: { lte: now },
              endDate: { gte: now },
            },
          ],
        },
      },
      include: {
        advertisement: {
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            targetUrl: true,
            type: true,
            status: true,
            priority: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: [
        // 按優先級排序（高優先級先顯示）
        { advertisement: { priority: "desc" } },
        // 同優先級按位置排序
        { position: "asc" },
      ],
    })

    if (!adPlacement) {
      return NextResponse.json({ ad: null, placement })
    }

    const ad = adPlacement.advertisement

    return NextResponse.json({
      ad: {
        id: ad.id,
        title: ad.title,
        description: ad.description,
        imageUrl: ad.imageUrl,
        targetUrl: ad.targetUrl,
        type: ad.type,
        status: ad.status,
        priority: ad.priority,
        startDate: ad.startDate?.toISOString() || null,
        endDate: ad.endDate?.toISOString() || null,
      },
      placement,
    })
  } catch (error) {
    console.error("獲取廣告錯誤:", error)
    return NextResponse.json(
      { error: "獲取廣告失敗" },
      { status: 500 }
    )
  }
}
