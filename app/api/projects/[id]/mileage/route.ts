import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

export interface MileageData {
  waypoints: string[]      // 站點名稱
  totalKm: number          // 總里程
  fuelPrice: number        // 油價 ($/L)
  fuelEfficiency: number   // 油耗 (km/L)
  participants: number     // 參與人數
}

// 獲取里程資料
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

    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: authUser.id,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "無權限訪問此專案" }, { status: 403 })
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { mileageData: true },
    })

    if (!project) {
      return NextResponse.json({ error: "專案不存在" }, { status: 404 })
    }

    const defaultData: MileageData = {
      waypoints: ["", ""],
      totalKm: 0,
      fuelPrice: 32,
      fuelEfficiency: 12,
      participants: 2,
    }

    return NextResponse.json(project.mileageData || defaultData)
  } catch (error) {
    console.error("獲取里程資料錯誤:", error)
    return NextResponse.json(
      { error: "獲取里程資料失敗" },
      { status: 500 }
    )
  }
}

// 更新里程資料
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

    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: authUser.id,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "無權限訪問此專案" }, { status: 403 })
    }

    const body = await req.json()
    const mileageData: MileageData = {
      waypoints: body.waypoints || [],
      totalKm: Number(body.totalKm) || 0,
      fuelPrice: Number(body.fuelPrice) || 32,
      fuelEfficiency: Number(body.fuelEfficiency) || 12,
      participants: Number(body.participants) || 2,
    }

    await prisma.project.update({
      where: { id },
      data: { mileageData: mileageData as object },
    })

    return NextResponse.json(mileageData)
  } catch (error) {
    console.error("更新里程資料錯誤:", error)
    return NextResponse.json(
      { error: "更新里程資料失敗" },
      { status: 500 }
    )
  }
}
