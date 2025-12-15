import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

// 獲取專案成員列表
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 檢查用戶是否為專案成員
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: session.user.id,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "無權限訪問此專案" }, { status: 403 })
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
    console.error("獲取成員列表錯誤:", error)
    return NextResponse.json(
      { error: "獲取成員列表失敗" },
      { status: 500 }
    )
  }
}

// 新增成員（透過名稱建立佔位成員）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 檢查當前用戶是否為專案成員
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: session.user.id,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "無權限訪問此專案" }, { status: 403 })
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

    // 新增佔位成員（不綁定用戶）
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
    console.error("新增成員錯誤:", error)
    return NextResponse.json(
      { error: "新增成員失敗" },
      { status: 500 }
    )
  }
}

// 移除成員（只有專案創建者可以移除）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    const body = await req.json()
    const { memberId } = body

    if (!memberId) {
      return NextResponse.json({ error: "成員ID必填" }, { status: 400 })
    }

    // 檢查專案是否存在
    const project = await prisma.project.findUnique({
      where: { id: id },
    })

    if (!project) {
      return NextResponse.json({ error: "專案不存在" }, { status: 404 })
    }

    // 只有創建者可以移除成員
    if (project.createdBy !== session.user.id) {
      return NextResponse.json({ error: "只有創建者可以移除成員" }, { status: 403 })
    }

    // 取得成員資料
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
    })

    if (!member || member.projectId !== id) {
      return NextResponse.json({ error: "成員不存在" }, { status: 404 })
    }

    // 不能移除自己
    if (member.userId === session.user.id) {
      return NextResponse.json({ error: "不能移除自己" }, { status: 400 })
    }

    await prisma.projectMember.delete({
      where: { id: memberId },
    })

    return NextResponse.json({ message: "成員已移除" })
  } catch (error) {
    console.error("移除成員錯誤:", error)
    return NextResponse.json(
      { error: "移除成員失敗" },
      { status: 500 }
    )
  }
}

