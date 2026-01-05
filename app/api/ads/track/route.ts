import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import type { AdEventType } from "@/types/ads"

// POST /api/ads/track - 追蹤廣告事件
export async function POST(req: NextRequest) {
  try {
    // 解析請求體（支援 sendBeacon 的 text/plain）
    let body: {
      adId: string
      event: AdEventType
      userId?: string
      timestamp?: string
    }

    const contentType = req.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      body = await req.json()
    } else {
      // sendBeacon 發送的是 text/plain
      const text = await req.text()
      body = JSON.parse(text)
    }

    const { adId, event, userId } = body

    // 驗證必填欄位
    if (!adId || !event) {
      return NextResponse.json(
        { error: "缺少必要參數" },
        { status: 400 }
      )
    }

    if (!["impression", "click"].includes(event)) {
      return NextResponse.json(
        { error: "無效的事件類型" },
        { status: 400 }
      )
    }

    // 驗證廣告存在
    const ad = await prisma.advertisement.findUnique({
      where: { id: adId },
      select: { id: true, deletedAt: true },
    })

    if (!ad || ad.deletedAt) {
      return NextResponse.json(
        { error: "廣告不存在" },
        { status: 404 }
      )
    }

    // 獲取今天的日期（UTC）
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    // 使用 upsert 更新或創建今日的分析記錄
    if (event === "impression") {
      await prisma.$transaction([
        // 更新每日分析
        prisma.adAnalytics.upsert({
          where: {
            advertisementId_date: {
              advertisementId: adId,
              date: today,
            },
          },
          update: {
            impressions: { increment: 1 },
            // 如果有 userId，增加獨立用戶計數的邏輯可以在這裡添加
            // 但為了簡化，這裡只增加曝光數
          },
          create: {
            advertisementId: adId,
            date: today,
            impressions: 1,
            clicks: 0,
            uniqueUsers: userId ? 1 : 0,
          },
        }),
        // 更新廣告總計數
        prisma.advertisement.update({
          where: { id: adId },
          data: {
            totalImpressions: { increment: 1 },
          },
        }),
      ])
    } else if (event === "click") {
      await prisma.$transaction([
        // 更新每日分析
        prisma.adAnalytics.upsert({
          where: {
            advertisementId_date: {
              advertisementId: adId,
              date: today,
            },
          },
          update: {
            clicks: { increment: 1 },
          },
          create: {
            advertisementId: adId,
            date: today,
            impressions: 0,
            clicks: 1,
            uniqueUsers: 0,
          },
        }),
        // 更新廣告總計數
        prisma.advertisement.update({
          where: { id: adId },
          data: {
            totalClicks: { increment: 1 },
          },
        }),
      ])
    }

    // 返回成功（sendBeacon 不需要響應內容）
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("追蹤事件錯誤:", error)
    // 追蹤失敗不應返回錯誤，以免影響用戶體驗
    return new NextResponse(null, { status: 204 })
  }
}
