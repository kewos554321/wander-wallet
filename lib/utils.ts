import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 取得分享連結的 base URL
 * 生產環境使用 LIFF URL（在 LINE 內開啟）
 * 開發環境使用當前網址
 */
export function getShareBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_LIFF_URL || ""
  }
  return process.env.NEXT_PUBLIC_LIFF_URL || window.location.origin
}

/**
 * 產生專案分享連結
 */
export function getProjectShareUrl(shareCode: string): string {
  const baseUrl = getShareBaseUrl()
  return `${baseUrl}/projects/join?code=${shareCode}`
}
