import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { parseExpenses, type MemberInfo } from "@/lib/ai/expense-parser"

interface RequestBody {
  transcript: string
  members: MemberInfo[]
  currentUserMemberId: string
}

/**
 * POST /api/voice/parse
 * 使用 AI 解析語音/文字輸入的費用內容
 */
export async function POST(req: NextRequest) {
  try {
    // 驗證身份
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    // 解析請求
    const body: RequestBody = await req.json()
    const { transcript, members, currentUserMemberId } = body

    // 驗證輸入
    if (!transcript?.trim()) {
      return NextResponse.json(
        { error: "請輸入或說出消費內容" },
        { status: 400 }
      )
    }

    if (!members || members.length === 0) {
      return NextResponse.json(
        { error: "專案沒有成員" },
        { status: 400 }
      )
    }

    // 取得目前用戶名字
    const currentMember = members.find((m) => m.id === currentUserMemberId)
    const currentUserName = currentMember?.displayName || "我"

    // 使用 LangChain 解析（支援多筆）
    const result = await parseExpenses({
      transcript,
      members,
      currentUserName,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Voice parse error:", error)

    const message =
      error instanceof Error ? error.message : "解析失敗，請重試"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
