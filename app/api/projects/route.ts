import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"

// 創建新專案
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 驗證用戶是否存在於資料庫中
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
    })

    if (!user) {
      console.error("用戶不存在:", authUser.id)
      return NextResponse.json(
        {
          error: "用戶不存在",
          details: "請重新登入",
          requiresLogout: true,
        },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { name, description, cover, startDate, endDate, budget, currency, joinMode } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "專案名稱必填" }, { status: 400 })
    }

    // 驗證日期
    let startDateObj: Date | null = null
    let endDateObj: Date | null = null

    if (startDate) {
      startDateObj = new Date(startDate)
      if (isNaN(startDateObj.getTime())) {
        return NextResponse.json({ error: "無效的出發日期" }, { status: 400 })
      }
    }

    if (endDate) {
      endDateObj = new Date(endDate)
      if (isNaN(endDateObj.getTime())) {
        return NextResponse.json({ error: "無效的結束日期" }, { status: 400 })
      }
    }

    // 驗證結束日期必須晚於出發日期
    if (startDateObj && endDateObj && endDateObj < startDateObj) {
      return NextResponse.json({ error: "結束日期需晚於出發日期" }, { status: 400 })
    }

    // 創建專案並將創建者加入成員
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        cover: cover || null,
        budget: budget ? Number(budget) : null,
        currency: currency || DEFAULT_CURRENCY,
        startDate: startDateObj,
        endDate: endDateObj,
        joinMode: joinMode || "both",
        createdBy: authUser.id,
        members: {
          create: {
            userId: authUser.id,
            displayName: user.name || user.lineUserId.slice(0, 8),
            role: "owner",
            claimedAt: new Date(),
          },
        },
      },
      include: {
        members: {
          include: {
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
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error: unknown) {
    console.error("創建專案錯誤:", error)
    const prismaError = error as { message?: string; code?: string; meta?: unknown }
    console.error("錯誤詳情:", {
      message: prismaError?.message,
      code: prismaError?.code,
      meta: prismaError?.meta,
    })
    
    // 如果是数据库表不存在的错误，提供更明确的提示
    if (prismaError?.code === 'P2022' || prismaError?.message?.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: "資料庫表結構不完整",
          details: "請運行數據庫遷移：npx prisma migrate dev",
          code: prismaError?.code,
          hint: "數據庫中缺少必要的表或列，請檢查遷移狀態並運行遷移。",
        },
        { status: 500 }
      )
    }

    // 如果是外鍵約束錯誤，說明用戶不存在
    if (prismaError?.code === "P2003") {
      return NextResponse.json(
        {
          error: "用戶記錄不存在",
          details: "請重新登入",
          requiresLogout: true,
          code: prismaError?.code,
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        error: "創建專案失敗",
        details: prismaError?.message || "未知錯誤",
        code: prismaError?.code,
      },
      { status: 500 }
    )
  }
}

// 獲取用戶的所有專案
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)

    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: authUser.id,
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
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
        expenses: {
          where: {
            deletedAt: null, // 排除軟刪除的支出
          },
          select: {
            amount: true,
          },
        },
        _count: {
          select: {
            expenses: {
              where: {
                deletedAt: null, // 排除軟刪除的支出
              },
            },
            members: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    // 計算每個專案的總金額並加到回應中（避免前端重複計算）
    const projectsWithTotal = projects.map((project) => ({
      ...project,
      totalAmount: project.expenses.reduce(
        (sum, expense) => sum + Number(expense.amount),
        0
      ),
      expenses: undefined, // 移除 expenses 陣列，只保留 totalAmount
    }))

    return NextResponse.json(projectsWithTotal)
  } catch (error: unknown) {
    console.error("獲取專案錯誤 - 完整錯誤:", error)
    const prismaError = error as { message?: string; code?: string; meta?: unknown }
    console.error("獲取專案錯誤 - 詳細:", {
      message: prismaError?.message,
      code: prismaError?.code,
      meta: prismaError?.meta,
    })
    return NextResponse.json(
      {
        error: "獲取專案失敗",
        details: prismaError?.message || String(error),
        code: prismaError?.code,
      },
      { status: 500 }
    )
  }
}

