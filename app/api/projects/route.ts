import { NextRequest, NextResponse } from "next/server"
import { auth, signOut } from "@/auth"
import { prisma } from "@/lib/db"
import { randomBytes } from "crypto"

// 生成唯一的分享碼
function generateShareCode(): string {
  return randomBytes(8).toString("base64url").slice(0, 12).toUpperCase()
}

// 自動登出無效的 session
async function logout() {
  try {
    await signOut({ redirect: false })
  } catch (error) {
    console.error("登出失敗:", error)
  }
}

// 創建新專案
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 驗證用戶是否存在於資料庫中
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      console.error("用戶不存在:", session.user.id)
      // 自動登出無效的 session
      await logout()
      return NextResponse.json(
        { 
          error: "用戶不存在",
          details: "已自動登出，請重新登入",
          requiresLogout: true,
          hint: "數據庫可能已重置，請重新登入以創建用戶記錄",
        },
        { 
          status: 401,
          headers: {
            "Clear-Site-Data": '"cache", "cookies", "storage"',
          },
        }
      )
    }

    const body = await req.json()
    const { name, description, startDate, endDate } = body

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

    // 生成唯一的分享碼
    let shareCode = generateShareCode()
    let existingProject = await prisma.project.findUnique({
      where: { shareCode },
    })
    // 如果分享碼已存在，重新生成
    while (existingProject) {
      shareCode = generateShareCode()
      existingProject = await prisma.project.findUnique({
        where: { shareCode },
      })
    }

    // 創建專案並將創建者加入成員
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        startDate: startDateObj,
        endDate: endDateObj,
        shareCode,
        createdBy: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            displayName: user.name || user.email.split("@")[0],
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
      // 自動登出無效的 session
      await logout()
      
      return NextResponse.json(
        { 
          error: "用戶記錄不存在",
          details: "已自動登出，請重新登入",
          requiresLogout: true,
          code: prismaError?.code,
          hint: "數據庫可能已重置，請重新登入系統。",
        },
        { 
          status: 401,
          headers: {
            "Clear-Site-Data": '"cache", "cookies", "storage"',
          },
        }
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
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
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
          include: {
            payer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            expenses: true,
            members: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error("獲取專案錯誤:", error)
    return NextResponse.json(
      { error: "獲取專案失敗" },
      { status: 500 }
    )
  }
}

