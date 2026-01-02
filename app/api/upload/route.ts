import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { getUploadUrl, generateFileKey, getPublicUrl, deleteFile, extractKeyFromUrl } from "@/lib/r2"

// 取得預簽名上傳 URL
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    const body = await req.json()
    const { projectId, contentType, type = "expense" } = body

    if (!projectId) {
      return NextResponse.json({ error: "專案 ID 必填" }, { status: 400 })
    }

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

    // 取得預簽名上傳 URL
    const uploadUrl = await getUploadUrl(key, contentType)

    // 回傳上傳 URL 和最終的公開 URL
    return NextResponse.json({
      uploadUrl,
      publicUrl: getPublicUrl(key),
      key,
    })
  } catch (error) {
    console.error("取得上傳 URL 錯誤:", error)
    return NextResponse.json(
      { error: "取得上傳 URL 失敗" },
      { status: 500 }
    )
  }
}

// 刪除 R2 上的圖片
export async function DELETE(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const imageUrl = searchParams.get("url")

    if (!imageUrl) {
      return NextResponse.json({ error: "圖片 URL 必填" }, { status: 400 })
    }

    // 從 URL 提取 key
    const key = extractKeyFromUrl(imageUrl)
    if (!key) {
      // 可能是 base64 或外部 URL，不需刪除
      return NextResponse.json({ success: true, message: "非 R2 圖片，跳過刪除" })
    }

    // 刪除 R2 檔案
    await deleteFile(key)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("刪除圖片錯誤:", error)
    return NextResponse.json(
      { error: "刪除圖片失敗" },
      { status: 500 }
    )
  }
}
