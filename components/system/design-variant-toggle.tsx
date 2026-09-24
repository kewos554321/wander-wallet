"use client"

import { Palette } from "lucide-react"
import { useDesignVariant } from "@/components/system/design-variant-provider"

/**
 * 本機測試用的 theme v2 切換開關。
 * 只有 NEXT_PUBLIC_THEME_V2=true 時才會渲染，正式站不受影響。
 */
export function DesignVariantToggle() {
  const { variant, setVariant, flagEnabled } = useDesignVariant()

  if (!flagEnabled) return null

  return (
    <button
      onClick={() => setVariant(variant === "v2" ? "legacy" : "v2")}
      className="fixed bottom-6 right-4 z-[9999] flex h-10 items-center gap-1.5 rounded-full border border-slate-600 bg-black/80 px-3 text-xs font-medium text-white shadow-xl backdrop-blur"
      title="切換 theme v2（本機測試用）"
    >
      <Palette className="h-4 w-4" />
      {variant === "v2" ? "v2" : "legacy"}
    </button>
  )
}
