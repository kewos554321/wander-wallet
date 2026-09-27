"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Info } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"

export function BalanceCard({ balance, currency, projectId }: { balance: number; currency: string; projectId: string }) {
  const [showInfo, setShowInfo] = useState(false)
  const rounded = Math.round(balance)
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : ""
  const tone = rounded < 0 ? "text-v2-danger" : "text-v2-lake"

  return (
    <div className="mx-4 mt-3 rounded-[18px] border border-v2-line bg-v2-surface px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <p className="m-0 text-sm font-medium leading-5 tracking-[.1px]">我的餘額</p>
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            aria-label="說明餘額計算方式"
            aria-expanded={showInfo}
            className="flex h-4 w-4 items-center justify-center rounded-full border border-v2-check p-0 text-v2-ink-subtle"
          >
            <Info className="h-2.5 w-2.5" strokeWidth={2} />
          </button>
        </div>
        <Link
          href={`/projects/${projectId}/settle`}
          className="inline-flex items-center gap-1 text-xs font-medium leading-4 tracking-[.5px] text-v2-link"
        >
          查看結算明細
          <ArrowRight className="h-[11px] w-[11px]" strokeWidth={2.2} />
        </Link>
      </div>
      <p className={`mt-0.5 font-v2-serif text-2xl font-bold leading-8 tabular-nums ${tone}`}>
        {sign}
        {formatCurrency(Math.abs(rounded), currency)}
      </p>
      {showInfo && (
        <p className="mt-1 text-xs leading-4 tracking-[.4px] text-v2-ink-subtle">
          ＝你付的錢－你應付的錢，正數代表有旅伴欠你款項
        </p>
      )}
    </div>
  )
}
