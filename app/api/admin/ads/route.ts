import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import type { AdPlacementType, AdType, AdStatus } from "@/types/ads"

// GET /api/admin/ads - 獲取廣告列表
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") as AdStatus | null
    const type = searchParams.get("type") as AdType | null

    const ads = await prisma.advertisement.findMany({
      where: {
        deletedAt: null,
        ...(status && { status }),
        ...(type && { type }),
      },
      include: {
        placements: true,
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json(ads)
  } catch (error) {
    console.error("獲取廣告列表錯誤:", error)
    return NextResponse.json(
      { error: "獲取廣告列表失敗" },
      { status: 500 }
    )
  }
}

// POST /api/admin/ads - 建立新廣告
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      title,
      description,
      imageUrl,
      targetUrl,
      type = "banner",
      status = "draft",
      priority = 0,
      startDate,
      endDate,
      placements = [],
    } = body as {
      title: string
      description?: string
      imageUrl?: string
      targetUrl: string
      type?: AdType
      status?: AdStatus
      priority?: number
      startDate?: string | null
      endDate?: string | null
      placements: AdPlacementType[]
    }

    // 驗證必填欄位
    if (!title?.trim()) {
      return NextResponse.json(
        { error: "請輸入廣告標題" },
        { status: 400 }
      )
    }
    if (!targetUrl?.trim()) {
      return NextResponse.json(
        { error: "請輸入目標連結" },
        { status: 400 }
      )
    }
    if (!placements || placements.length === 0) {
      return NextResponse.json(
        { error: "請選擇至少一個投放版位" },
        { status: 400 }
      )
    }

    // 確保有一個管理員（開發用，之後要改成從 session 取得）
    let admin = await prisma.admin.findFirst({
      where: { isActive: true },
    })

    if (!admin) {
      // 建立預設管理員
      admin = await prisma.admin.create({
        data: {
          email: "admin@wanderwallet.app",
          passwordHash: "$2b$10$placeholder",
          name: "系統管理員",
          role: "admin",
          isActive: true,
        },
      })
    }

    // 建立廣告
    const advertisement = await prisma.advertisement.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        imageUrl: imageUrl || null,
        targetUrl: targetUrl.trim(),
        type,
        status,
        priority,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdBy: admin.id,
        placements: {
          create: placements.map((placement, index) => ({
            placement,
            position: index,
            isActive: true,
          })),
        },
      },
      include: {
        placements: true,
      },
    })

    return NextResponse.json(advertisement, { status: 201 })
  } catch (error) {
    console.error("建立廣告錯誤:", error)
    return NextResponse.json(
      { error: "建立廣告失敗" },
      { status: 500 }
    )
  }
}
