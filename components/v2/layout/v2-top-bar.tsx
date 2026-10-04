"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

interface V2TopBarProps {
  title: string
  backHref: string
  actions?: ReactNode
  titleClassName?: string
  /** Ignore browser history and always navigate to `backHref` (e.g. the trip overview's "back to trips"). */
  fixedBack?: boolean
  /** Override the default chevron icon (e.g. the brand mark for the trip-list destination). */
  backIcon?: ReactNode
  /** Override the back control's wrapper classes (e.g. drop the circle for a brand mark). */
  backClassName?: string
  /** Accessible name for the back link; defaults to 返回. */
  backAriaLabel?: string
}

export function V2TopBar({ title, backHref, actions, titleClassName, fixedBack = false, backIcon, backClassName, backAriaLabel = "返回" }: V2TopBarProps) {
  return (
    <div className="flex items-center justify-between border-b border-v2-line px-3.5 py-4">
      <Link
        href={backHref}
        aria-label={backAriaLabel}
        onClick={(event) => {
          if (fixedBack) return
          // Prefer real navigation history; on a fresh load fall back to backHref.
          if (typeof window !== "undefined" && window.history.length > 1) {
            event.preventDefault()
            window.history.back()
          }
        }}
        className={
          backClassName ??
          "flex h-[34px] w-[34px] items-center justify-center rounded-full border border-v2-line bg-v2-surface text-v2-ink"
        }
      >
        {backIcon ?? <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} />}
      </Link>
      <h1 className={`m-0 font-v2-serif leading-6 tracking-[.15px] ${titleClassName ?? "text-base font-medium"}`}>{title}</h1>
      <div className="flex min-w-[34px] justify-end gap-1.5">{actions}</div>
    </div>
  )
}
