import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { randomBytes } from "crypto"

// 生成唯一的分享碼
function generateShareCode(): string {
  return randomBytes(8).toString("base64url").slice(0, 12).toUpperCase()
}

// 創建新專案
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    const body = await req.json()
    const { name, description } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "專案名稱必填" }, { status: 400 })
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
        shareCode,
        createdBy: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "owner",
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
  } catch (error) {
    console.error("創建專案錯誤:", error)
    return NextResponse.json(
      { error: "創建專案失敗" },
      { status: 500 }
    )
  }
}

// 獲取用戶的所有專案
export async function GET(req: NextRequest) {
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

