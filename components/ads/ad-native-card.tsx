"use client"

import Image from "next/image"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Ad } from "@/types/ads"

interface AdNativeCardProps {
  ad: Ad
  className?: string
  onClick?: () => void
}

export function AdNativeCard({ ad, className, onClick }: AdNativeCardProps) {
  return (
    <div
      className={cn(
        "relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 cursor-pointer transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.98]",
        className
      )}
      onClick={onClick}
    >
      {/* 贊助標籤 */}
      <div className="absolute top-3 right-3 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] text-slate-500 dark:text-slate-400 font-medium">
        贊助
      </div>

      <div className="flex gap-3">
        {/* 左側圖片 */}
        {ad.imageUrl && (
          <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
            <Image
              src={ad.imageUrl}
              alt={ad.title}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
        )}

        {/* 右側內容 */}
        <div className="flex-1 min-w-0 pr-12">
          <h3 className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
            {ad.title}
          </h3>
          {ad.description && (
            <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 mt-1">
              {ad.description}
            </p>
          )}
          {/* 連結提示 */}
          <div className="flex items-center gap-1 mt-2 text-xs text-blue-500 dark:text-blue-400">
            <span className="truncate">{extractDomain(ad.targetUrl)}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  )
}

// 從 URL 提取網域
function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname
    return domain.replace("www.", "")
  } catch {
    return url
  }
}
