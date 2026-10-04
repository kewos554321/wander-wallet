"use client"

import { Coffee, Heart, Mail } from "lucide-react"
import { SPONSOR_LINKS } from "@/lib/constants/sponsor"

const secondaryLink = "inline-flex items-center gap-1 text-xs font-medium text-v2-ink-muted"

export function SponsorCard() {
  return (
    <div className="mx-4 mt-4 rounded-2xl border border-v2-line bg-gradient-to-br from-v2-rose-soft to-v2-surface px-4 py-4 shadow-[0_2px_8px_rgba(27,24,21,.05)]">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-v2-rose text-v2-on-dark"
          aria-hidden="true"
        >
          <Heart className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="m-0 font-v2-serif text-sm font-semibold">喜歡 Wander Wallet 嗎？</p>
          <p className="mt-0.5 text-[11px] text-v2-ink-muted">支持我們持續開發新功能</p>
        </div>
      </div>

      <a
        href={SPONSOR_LINKS.buyMeACoffee}
        target="_blank"
        rel="noreferrer"
        className="mt-3.5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-v2-rose text-sm font-semibold text-v2-on-dark shadow-[0_4px_10px_rgba(161,74,104,.25)]"
      >
        <Coffee className="h-[18px] w-[18px]" aria-hidden="true" />
        請我們喝杯咖啡
      </a>

      <div className="mt-3 flex items-center justify-center gap-5">
        <a href={SPONSOR_LINKS.koFi} target="_blank" rel="noreferrer" className={secondaryLink}>
          <Heart className="h-[13px] w-[13px]" aria-hidden="true" />
          Ko-fi
        </a>
        <a href={SPONSOR_LINKS.paypal} target="_blank" rel="noreferrer" className={secondaryLink}>
          PayPal
        </a>
        <a href={SPONSOR_LINKS.email} className={secondaryLink}>
          <Mail className="h-[13px] w-[13px]" aria-hidden="true" />
          其他方式
        </a>
      </div>
    </div>
  )
}
