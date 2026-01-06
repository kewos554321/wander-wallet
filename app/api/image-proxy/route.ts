import { NextRequest, NextResponse } from "next/server"

// 代理外部圖片以避免 CORS 問題
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url")

    if (!url) {
      return NextResponse.json({ error: "缺少 url 參數" }, { status: 400 })
    }

    // 驗證 URL 是否為有效的圖片 URL
    const allowedDomains = [
      "pub-", // R2 public bucket
      "r2.cloudflarestorage.com",
      "cloudflare",
    ]

    const isAllowed = allowedDomains.some((domain) => url.includes(domain))
    if (!isAllowed && !url.startsWith("http")) {
      return NextResponse.json({ error: "不允許的 URL" }, { status: 403 })
    }

    // Fetch 圖片
    const response = await fetch(url)

    if (!response.ok) {
      return NextResponse.json(
        { error: "無法取得圖片" },
        { status: response.status }
      )
    }

    // 取得圖片的 content-type
    const contentType = response.headers.get("content-type") || "image/jpeg"

    // 將圖片轉為 buffer
    const buffer = await response.arrayBuffer()

    // 轉為 base64
    const base64 = Buffer.from(buffer).toString("base64")
    const dataUrl = `data:${contentType};base64,${base64}`

    return NextResponse.json({ dataUrl })
  } catch (error) {
    console.error("圖片代理錯誤:", error)
    return NextResponse.json({ error: "取得圖片失敗" }, { status: 500 })
  }
}
