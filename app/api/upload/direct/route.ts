import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { uploadToR2, generateFileKey, getPublicUrl } from "@/lib/r2"

/**
 * iOS 專用：直接上傳圖片到 R2（透過後端）
 * 因為 iOS LIFF 對 cross-origin PUT 請求有 CORS 限制
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const projectId = formData.get("projectId") as string | null
    const type = (formData.get("type") as string) || "expense"

    if (!file) {
      return NextResponse.json({ error: "請選擇檔案" }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: "專案 ID 必填" }, { status: 400 })
    }

    const contentType = file.type
    if (!contentType || !contentType.startsWith("image/")) {
      return NextResponse.json({ error: "僅支援圖片格式" }, { status: 400 })
    }

    // 根據 content-type 決定副檔名
    const extMap: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
    }
    const ext = extMap[contentType] || ".jpg"

    // 產生唯一的檔案 key
    const key = generateFileKey(projectId, type as "expense" | "cover") + ext

    // 讀取檔案內容並上傳到 R2
    const buffer = Buffer.from(await file.arrayBuffer())
    await uploadToR2(key, buffer, contentType)

    // 回傳公開 URL
    return NextResponse.json({
      publicUrl: getPublicUrl(key),
      key,
    })
  } catch (error) {
    console.error("上傳圖片錯誤:", error)
    return NextResponse.json(
      { error: "上傳圖片失敗" },
      { status: 500 }
    )
  }
}
