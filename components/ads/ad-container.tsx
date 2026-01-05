"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { AdBanner } from "./ad-banner"
import { AdNativeCard } from "./ad-native-card"
import { trackAdEvent, getAnonymousUserId, hasTrackedImpression } from "@/lib/ads/tracking"
import type { Ad, AdPlacementType } from "@/types/ads"

interface AdContainerProps {
  placement: AdPlacementType
  variant?: "banner" | "native" | "auto"
  className?: string
  fallback?: React.ReactNode
}

export function AdContainer({
  placement,
  variant = "auto",
  className,
  fallback,
}: AdContainerProps) {
  const [ad, setAd] = useState<Ad | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasTrackedRef = useRef(false)

  // 獲取廣告
  useEffect(() => {
    let cancelled = false

    async function fetchAd() {
      try {
        setLoading(true)
        setError(false)

        const res = await fetch(`/api/ads?placement=${placement}`)
        if (!res.ok) {
          throw new Error("Failed to fetch ad")
        }

        const data = await res.json()
        if (!cancelled) {
          setAd(data.ad || null)
        }
      } catch {
        if (!cancelled) {
          setError(true)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchAd()

    return () => {
      cancelled = true
    }
  }, [placement])

  // 曝光追蹤（使用 Intersection Observer）
  useEffect(() => {
    if (!ad || hasTrackedRef.current || hasTrackedImpression(ad.id)) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        // 當廣告可見面積超過 50% 時，記錄曝光
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          hasTrackedRef.current = true
          const userId = getAnonymousUserId()
          trackAdEvent(ad.id, "impression", userId)
        }
      },
      {
        threshold: 0.5,
        rootMargin: "0px",
      }
    )

    const currentRef = containerRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [ad])

  // 點擊處理
  const handleClick = useCallback(() => {
    if (!ad) return

    // 追蹤點擊
    const userId = getAnonymousUserId()
    trackAdEvent(ad.id, "click", userId)

    // 開啟目標連結
    window.open(ad.targetUrl, "_blank", "noopener,noreferrer")
  }, [ad])

  // 載入中或錯誤時不顯示
  if (loading) {
    return null
  }

  // 無廣告或錯誤時顯示 fallback
  if (!ad || error) {
    return fallback ? <>{fallback}</> : null
  }

  // 決定使用哪種組件
  const adVariant = variant === "auto" ? ad.type : variant

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      {adVariant === "banner" ? (
        <AdBanner ad={ad} onClick={handleClick} />
      ) : (
        <AdNativeCard ad={ad} onClick={handleClick} />
      )}
    </div>
  )
}

// 用於在列表中插入廣告的輔助組件
interface AdSlotProps {
  placement: AdPlacementType
  index: number
  interval: number // 每隔多少個項目顯示一個廣告
  variant?: "banner" | "native" | "auto"
  className?: string
}

export function AdSlot({
  placement,
  index,
  interval,
  variant = "native",
  className,
}: AdSlotProps) {
  // 只在特定位置顯示廣告
  // 例如 interval=3 時，在 index 2, 5, 8... 後顯示
  const shouldShow = (index + 1) % interval === 0

  if (!shouldShow) {
    return null
  }

  return (
    <AdContainer
      placement={placement}
      variant={variant}
      className={className}
    />
  )
}
