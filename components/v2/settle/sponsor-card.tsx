"use client"

import { Coffee, Heart, Mail } from "lucide-react"
import { SPONSOR_LINKS } from "@/lib/constants/sponsor"

const button = "inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-v2-line bg-v2-surface px-2.5 py-1.5 text-[11px] font-semibold"

export function SponsorCard() {
  return (
    <div className="mx-4 mt-4 rounded-2xl border border-v2-line bg-v2-surface px-3.5 py-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-v2-rose-soft text-v2-rose" aria-hidden="true">
          <Heart className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="m-0 font-v2-serif text-[13px] font-semibold">喜歡 Wander Wallet 嗎？</p>
          <p className="mt-0.5 text-[11px] text-v2-ink-muted">支持我們持續開發新功能</p>
        </div>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        <button type="button" className={button} onClick={() => window.open(SPONSOR_LINKS.buyMeACoffee, "_blank")}>
          <Coffee className="h-3.5 w-3.5" aria-hidden="true" />
          Buy Me a Coffee
        </button>
        <button type="button" className={button} onClick={() => window.open(SPONSOR_LINKS.koFi, "_blank")}>
          <Heart className="h-3.5 w-3.5" aria-hidden="true" />
          Ko-fi
        </button>
        <button type="button" className={button} onClick={() => window.open(SPONSOR_LINKS.paypal, "_blank")}>
          PayPal
        </button>
        <button type="button" className={button} onClick={() => (window.location.href = SPONSOR_LINKS.email)}>
          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
          其他方式
        </button>
      </div>
    </div>
  )
}
