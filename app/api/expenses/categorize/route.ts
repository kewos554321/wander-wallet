import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { classifyExpenseCategory } from "@/lib/ai/category-classifier"

const MAX_DESCRIPTION_LENGTH = 200

interface RequestBody {
  description?: unknown
}

/**
 * POST /api/expenses/categorize
 * 根據支出描述判斷最適合的類別
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    const body: RequestBody = await req.json().catch(() => ({}))
    const description = typeof body.description === "string" ? body.description.trim() : ""

    if (!description) {
      return NextResponse.json({ error: "請提供描述" }, { status: 400 })
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json({ error: "描述過長" }, { status: 400 })
    }

    const result = await classifyExpenseCategory(description)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Category classify error:", error)

    const message = error instanceof Error ? error.message : "分類失敗，請重試"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
