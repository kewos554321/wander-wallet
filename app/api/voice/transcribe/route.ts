import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions"

export async function POST(request: NextRequest) {
  try {
    // 驗證登入
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 })
    }

    // 檢查 API key
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: "伺服器未設定 GROQ_API_KEY" },
        { status: 500 }
      )
    }

    // 取得音檔
    const formData = await request.formData()
    const audioFile = formData.get("file") as File

    if (!audioFile) {
      return NextResponse.json({ error: "缺少音檔" }, { status: 400 })
    }

    // 轉發到 Groq API
    const groqFormData = new FormData()
    groqFormData.append("file", audioFile)
    groqFormData.append("model", "whisper-large-v3-turbo") // 最快的版本
    groqFormData.append("language", "zh") // 中文
    groqFormData.append("response_format", "json")

    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: groqFormData,
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error("Groq API error:", errorText)
      return NextResponse.json(
        { error: "語音轉文字失敗" },
        { status: groqResponse.status }
      )
    }

    const result = await groqResponse.json()

    return NextResponse.json({
      text: result.text || "",
      duration: result.duration,
    })
  } catch (error) {
    console.error("Transcribe error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "轉換失敗" },
      { status: 500 }
    )
  }
}
