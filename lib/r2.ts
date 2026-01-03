import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// R2 Client 設定
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME || ""
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "" // 例如: https://images.yourdomain.com

/**
 * 產生預簽名上傳 URL
 * 前端可直接用此 URL 上傳檔案到 R2
 */
export async function getUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  // URL 有效期 5 分鐘
  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 })
  return signedUrl
}

/**
 * 直接上傳檔案到 R2（後端使用）
 * @param key 檔案路徑
 * @param body 檔案內容
 * @param contentType MIME 類型
 */
export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  })

  await r2Client.send(command)
}

/**
 * 取得檔案的公開 URL
 */
export function getPublicUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`
}

/**
 * 產生唯一的檔案 key
 */
export function generateFileKey(projectId: string, type: "expense" | "cover" = "expense"): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${type}/${projectId}/${timestamp}-${random}`
}

/**
 * 刪除 R2 上的檔案
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })
  await r2Client.send(command)
}

/**
 * 從完整 URL 提取 key
 * 支援多種 URL 格式：
 * - 自訂網域: https://images.yourdomain.com/expense/xxx
 * - R2 預設: https://pub-xxx.r2.dev/expense/xxx
 */
export function extractKeyFromUrl(url: string): string | null {
  if (!url) return null

  // 嘗試匹配自訂網域
  if (PUBLIC_URL && url.startsWith(PUBLIC_URL)) {
    return url.replace(`${PUBLIC_URL}/`, "")
  }

  // 嘗試匹配 R2 預設 URL 格式: https://pub-xxx.r2.dev/key
  const r2DefaultMatch = url.match(/^https:\/\/pub-[a-f0-9]+\.r2\.dev\/(.+)$/)
  if (r2DefaultMatch) {
    return r2DefaultMatch[1]
  }

  // 嘗試從 URL 路徑提取 (expense/xxx 或 cover/xxx)
  const pathMatch = url.match(/((?:expense|cover)\/[^?]+)/)
  if (pathMatch) {
    return pathMatch[1]
  }

  return null
}
