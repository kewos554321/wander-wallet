"use client"

import { Coffee, Heart, Mail } from "lucide-react"
import { SPONSOR_LINKS } from "@/lib/constants/sponsor"

const button = "inline-flex items-center gap-1.5 rounded-full border border-v2-line bg-v2-surface px-3 py-1.5 text-xs font-semibold"

export function SponsorCard() {
  return (
    <div className="mx-4 mt-6 rounded-2xl border border-v2-line bg-v2-surface p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-v2-rose-soft text-v2-rose" aria-hidden="true">
          <Heart className="h-5 w-5" />
        </span>
        <div>
          <p className="m-0 font-v2-serif text-[15px] font-semibold">喜歡 Wander Wallet 嗎？</p>
          <p className="mt-0.5 text-xs text-v2-ink-muted">支持我們持續開發新功能</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-v2-ink-muted">
        Wander Wallet 是免費服務，由小團隊用愛維護。如果分帳工具對你有幫助，歡迎請我們喝杯咖啡！
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
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
