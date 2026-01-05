"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import type { Ad } from "@/types/ads"

interface AdBannerProps {
  ad: Ad
  className?: string
  onClick?: () => void
}

export function AdBanner({ ad, className, onClick }: AdBannerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]",
        className
      )}
      onClick={onClick}
    >
      {/* 廣告圖片 */}
      {ad.imageUrl ? (
        <div className="relative w-full aspect-[4/1]">
          <Image
            src={ad.imageUrl}
            alt={ad.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 600px"
          />
          {/* 底部漸層遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {/* 標題和描述 */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-white font-medium text-sm line-clamp-1">
              {ad.title}
            </h3>
            {ad.description && (
              <p className="text-white/80 text-xs line-clamp-1 mt-0.5">
                {ad.description}
              </p>
            )}
          </div>
        </div>
      ) : (
        // 無圖片時的文字版本
        <div className="p-4">
          <h3 className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
            {ad.title}
          </h3>
          {ad.description && (
            <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 mt-1">
              {ad.description}
            </p>
          )}
        </div>
      )}

      {/* 廣告標籤 */}
      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/50 dark:bg-white/20 rounded text-[10px] text-white font-medium">
        廣告
      </div>
    </div>
  )
}
