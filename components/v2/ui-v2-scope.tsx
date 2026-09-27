import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { notoSansTC, notoSerifTC } from "./fonts"

export function UiV2Scope({ children, className }: { children: ReactNode; className?: string }) {
  // Font variable classes are kept out of cn()'s twMerge pass: tailwind-merge
  // treats any "font-*" string as the single-value fontFamily conflict group,
  // so merging notoSerifTC.variable / notoSansTC.variable alongside the
  // font-v2-sans utility would silently drop all but the last one.
  return (
    <div
      data-ui="v2"
      className={`${notoSerifTC.variable} ${notoSansTC.variable} ${cn(
        "min-h-screen bg-v2-paper font-v2-sans text-v2-ink",
        className
      )}`}
    >
      {children}
    </div>
  )
}
