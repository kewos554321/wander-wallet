"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, Info } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"
import type { MemberBalance } from "@/lib/project-overview"

interface BalanceCardProps {
  balance: number
  currency: string
  projectId: string
  memberBalances?: MemberBalance[]
  currentMemberId?: string | null
  /** Mixed-currency balances are also converted, so they wait for rates too. */
  loading?: boolean
}

export function BalanceCard({
  balance,
  currency,
  projectId,
  memberBalances = [],
  currentMemberId,
  loading = false,
}: BalanceCardProps) {
  const [showInfo, setShowInfo] = useState(false)
  const rounded = Math.round(balance)
  const settled = rounded === 0
  const amount = Math.abs(rounded)
  const owedToYou = rounded > 0

  // The counterparties are whoever sits on the other side of the balance:
  // debtors when you are owed, creditors when you owe. Names make the card
  // answer "who?" instead of leaving a signed number to interpret.
  const counterparties = memberBalances.filter((member) => {
    if (member.memberId === currentMemberId) return false
    if (Math.round(member.balance) === 0) return false
    return owedToYou ? member.balance < 0 : member.balance > 0
  })
  const names = counterparties.map((member) => member.displayName)
  const namesText = names.length > 0 ? names.join("、") : "旅伴"
  const sentence = owedToYou
    ? `${namesText}${names.length > 1 ? "共" : ""}欠你這趟旅程先付的錢。`
    : `你欠${namesText}這趟旅程的代墊款。`

  return (
    <section data-testid="v2-balance-card" className="mx-4 mt-3 rounded-v2-lg border border-v2-line bg-v2-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          <p className="m-0 text-[13px] font-bold leading-4 text-v2-lake">我的餘額</p>
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            aria-label="說明餘額計算方式"
            aria-expanded={showInfo}
            className="relative -ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-v2-ink-muted after:absolute after:-inset-2 after:content-[''] hover:bg-v2-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
          >
            <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <Link
          href={`/projects/${projectId}/settle`}
          className="inline-flex shrink-0 items-center gap-1 rounded py-1 text-xs font-medium leading-4 tracking-[.5px] text-v2-link transition-colors duration-150 hover:text-v2-lake focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
        >
          {settled ? "查看結算紀錄" : "去結算"}
          <ArrowRight className="h-[11px] w-[11px]" strokeWidth={2.2} aria-hidden="true" />
        </Link>
      </div>

      {showInfo && (
        <p className="m-0 mt-1 text-xs leading-5 text-v2-ink-muted">
          你付的錢 − 你應付的錢。正數代表旅伴還欠你，負數代表你還欠旅伴。
        </p>
      )}

      {loading ? (
        <div data-testid="v2-balance-loading" className="mt-1" aria-hidden="true">
          <div className="h-8 w-36 animate-pulse rounded bg-v2-sand motion-reduce:animate-none" />
          <div className="mt-2 h-3.5 w-60 max-w-full animate-pulse rounded bg-v2-sand motion-reduce:animate-none" />
        </div>
      ) : settled ? (
        <div className="mt-1 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-v2-lake-soft text-v2-lake">
            <Check className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
          </span>
          <div>
            <p className="m-0 font-v2-serif text-xl font-bold leading-7">這趟旅程已結清</p>
            <p className="m-0 mt-0.5 text-[13px] leading-5 text-v2-ink-muted">沒有人需要再付錢。</p>
          </div>
        </div>
      ) : (
        <>
          <p
            className={`m-0 mt-0.5 font-v2-serif text-2xl font-bold leading-8 tabular-nums ${
              rounded < 0 ? "text-v2-danger" : "text-v2-ink"
            }`}
          >
            {formatCurrency(amount, currency)}
          </p>
          <p className="m-0 mt-0.5 text-[13px] leading-5 text-v2-ink-muted">{sentence}</p>
        </>
      )}
    </section>
  )
}
