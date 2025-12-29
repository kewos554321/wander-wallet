import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 獲取專案的操作歷史紀錄
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

    // 取得查詢參數
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const entityType = searchParams.get("entityType")

    // 建立查詢條件
    const where: {
      projectId: string
      entityType?: string
    } = {
      projectId: id,
    }

    if (entityType) {
      where.entityType = entityType
    }

    // 獲取歷史紀錄
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          actor: {
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
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.activityLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      hasMore: offset + logs.length < total,
    })
  } catch (error) {
    console.error("獲取歷史紀錄錯誤:", error)
    return NextResponse.json(
      { error: "獲取歷史紀錄失敗" },
      { status: 500 }
    )
  }
}
