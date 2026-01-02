import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { parseReceipt } from "@/lib/ai/receipt-parser"

interface RequestBody {
  imageData: string // base64 data URL (e.g., "data:image/jpeg;base64,...")
}

/**
 * POST /api/receipt/parse
 * 使用 AI Vision 解析發票/收據圖片
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
    const { imageData } = body

    // 驗證輸入
    if (!imageData?.trim()) {
      return NextResponse.json(
        { error: "請提供圖片資料" },
        { status: 400 }
      )
    }

    // 驗證是否為有效的 data URL
    if (!imageData.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "請提供有效的圖片格式" },
        { status: 400 }
      )
    }

    // 使用 Gemini Vision 解析圖片
    const result = await parseReceipt(imageData)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Receipt parse error:", error)

    const message =
      error instanceof Error ? error.message : "解析失敗，請重試"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
