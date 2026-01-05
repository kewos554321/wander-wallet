import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET /api/admin/stats - 獲取儀表板統計數據
export async function GET() {
  try {
    // 獲取廣告統計
    const [totalAds, activeAds, impressionsAndClicks, todayAnalytics] = await Promise.all([
      // 總廣告數
      prisma.advertisement.count({
        where: { deletedAt: null },
      }),
      // 活躍廣告數
      prisma.advertisement.count({
        where: { status: "active", deletedAt: null },
      }),
      // 總曝光和點擊（從 Advertisement 表）
      prisma.advertisement.aggregate({
        where: { deletedAt: null },
        _sum: {
          totalImpressions: true,
          totalClicks: true,
        },
      }),
      // 今日數據
      prisma.adAnalytics.aggregate({
        where: {
          date: {
            gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
          },
        },
        _sum: {
          impressions: true,
          clicks: true,
        },
      }),
    ])

    return NextResponse.json({
      totalAds,
      activeAds,
      totalImpressions: impressionsAndClicks._sum.totalImpressions ?? 0,
      totalClicks: impressionsAndClicks._sum.totalClicks ?? 0,
      todayImpressions: todayAnalytics._sum.impressions ?? 0,
      todayClicks: todayAnalytics._sum.clicks ?? 0,
    })
  } catch (error) {
    console.error("獲取統計數據錯誤:", error)
    return NextResponse.json(
      { error: "獲取統計數據失敗" },
      { status: 500 }
    )
  }
}
