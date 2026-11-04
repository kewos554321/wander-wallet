import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 獲取旅程備忘錄
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

    const project = await prisma.project.findUnique({
      where: { id },
      select: { memo: true },
    })

    if (!project) {
      return NextResponse.json({ error: "旅程不存在" }, { status: 404 })
    }

    return NextResponse.json({ memo: project.memo || "" })
  } catch (error) {
    console.error("獲取備忘錄錯誤:", error)
    return NextResponse.json(
      { error: "獲取備忘錄失敗" },
      { status: 500 }
    )
  }
}

// 更新旅程備忘錄
export async function PUT(
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

    const body = await req.json()
    const { memo } = body

    await prisma.project.update({
      where: { id },
      data: { memo: memo || null },
    })

    return NextResponse.json({ memo: memo || "" })
  } catch (error) {
    console.error("更新備忘錄錯誤:", error)
    return NextResponse.json(
      { error: "更新備忘錄失敗" },
      { status: 500 }
    )
  }
}
