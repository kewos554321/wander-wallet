import type { AdEventType } from "@/types/ads"

// 追蹤防重複的 Set（用於同一頁面會話內）
const trackedImpressions = new Set<string>()

/**
 * 追蹤廣告事件（曝光或點擊）
 * @param adId 廣告 ID
 * @param event 事件類型
 * @param userId 可選的用戶 ID
 */
export async function trackAdEvent(
  adId: string,
  event: AdEventType,
  userId?: string
): Promise<void> {
  // 曝光防重複（同一頁面會話內只追蹤一次）
  if (event === "impression") {
    const key = `${adId}-impression`
    if (trackedImpressions.has(key)) {
      return
    }
    trackedImpressions.add(key)
  }

  try {
    // 使用 sendBeacon 進行非阻塞追蹤
    // 這樣即使用戶立即離開頁面，追蹤請求也能完成
    const data = JSON.stringify({
      adId,
      event,
      userId,
      timestamp: new Date().toISOString(),
    })

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/ads/track", data)
    } else {
      // Fallback 到 fetch（用於不支援 sendBeacon 的環境）
      fetch("/api/ads/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data,
        keepalive: true,
      }).catch(() => {
        // 靜默失敗，不影響用戶體驗
      })
    }
  } catch {
    // 追蹤失敗不應影響用戶體驗
    console.warn("Ad tracking failed:", adId, event)
  }
}

/**
 * 清除追蹤記錄（用於測試或頁面切換）
 */
export function clearTrackedImpressions(): void {
  trackedImpressions.clear()
}

/**
 * 檢查廣告是否已追蹤曝光
 */
export function hasTrackedImpression(adId: string): boolean {
  return trackedImpressions.has(`${adId}-impression`)
}

/**
 * 生成用於追蹤的匿名用戶 ID
 * 使用 localStorage 持久化，保持用戶隱私的同時能追蹤獨立用戶數
 */
export function getAnonymousUserId(): string {
  if (typeof window === "undefined") {
    return ""
  }

  const storageKey = "ww_anonymous_id"
  let anonymousId = localStorage.getItem(storageKey)

  if (!anonymousId) {
    // 生成一個隨機 ID
    anonymousId = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    localStorage.setItem(storageKey, anonymousId)
  }

  return anonymousId
}
