import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 獲取旅程旅伴列表
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

    // 檢查用戶是否為旅程旅伴
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: authUser.id,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "無權限訪問此旅程" }, { status: 403 })
    }

    const members = await prisma.projectMember.findMany({
      where: {
        projectId: id,
      },
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
      orderBy: {
        joinedAt: "asc",
      },
    })

    return NextResponse.json(members)
  } catch (error) {
    console.error("獲取旅伴列表錯誤:", error)
    return NextResponse.json(
      { error: "獲取旅伴列表失敗" },
      { status: 500 }
    )
  }
}

// 新增旅伴（透過名稱建立佔位旅伴）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 檢查當前用戶是否為旅程旅伴
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: authUser.id,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "無權限訪問此旅程" }, { status: 403 })
    }

    const body = await req.json()
    const { name } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "名稱必填" }, { status: 400 })
    }

    const trimmedName = name.trim()

    if (trimmedName.length === 0) {
      return NextResponse.json({ error: "名稱不能為空" }, { status: 400 })
    }

    // 新增佔位旅伴（不綁定用戶）
    const newMember = await prisma.projectMember.create({
      data: {
        projectId: id,
        displayName: trimmedName,
        role: "member",
      },
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
    })

    return NextResponse.json(newMember, { status: 201 })
  } catch (error) {
    console.error("新增旅伴錯誤:", error)
    return NextResponse.json(
      { error: "新增旅伴失敗" },
      { status: 500 }
    )
  }
}

// 移除旅伴（只有旅程創建者可以移除）
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

    const body = await req.json()
    const { memberId } = body

    if (!memberId) {
      return NextResponse.json({ error: "旅伴ID必填" }, { status: 400 })
    }

    // 檢查旅程是否存在
    const project = await prisma.project.findUnique({
      where: { id: id },
    })

    if (!project) {
      return NextResponse.json({ error: "旅程不存在" }, { status: 404 })
    }

    // 只有創建者可以移除旅伴
    if (project.createdBy !== authUser.id) {
      return NextResponse.json({ error: "只有創建者可以移除旅伴" }, { status: 403 })
    }

    // 取得旅伴資料
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
    })

    if (!member || member.projectId !== id) {
      return NextResponse.json({ error: "旅伴不存在" }, { status: 404 })
    }

    // 不能移除自己
    if (member.userId === authUser.id) {
      return NextResponse.json({ error: "不能移除自己" }, { status: 400 })
    }

    // 檢查旅伴是否有關聯的支出記錄（只計算未刪除的支出）
    const [paidExpenses, participatedExpenses] = await Promise.all([
      prisma.expensePayer.count({
        where: {
          memberId: memberId,
          expense: { deletedAt: null },
        },
      }),
      prisma.expenseParticipant.count({
        where: {
          memberId: memberId,
          expense: { deletedAt: null },
        },
      }),
    ])

    if (paidExpenses > 0 || participatedExpenses > 0) {
      const messages: string[] = []
      if (paidExpenses > 0) {
        messages.push(`${paidExpenses} 筆付款記錄`)
      }
      if (participatedExpenses > 0) {
        messages.push(`${participatedExpenses} 筆分攤記錄`)
      }
      return NextResponse.json(
        { error: `無法移除此旅伴，尚有 ${messages.join(" 和 ")}` },
        { status: 400 }
      )
    }

    await prisma.projectMember.delete({
      where: { id: memberId },
    })

    return NextResponse.json({ message: "旅伴已移除" })
  } catch (error) {
    console.error("移除旅伴錯誤:", error)
    return NextResponse.json(
      { error: "移除旅伴失敗" },
      { status: 500 }
    )
  }
}

