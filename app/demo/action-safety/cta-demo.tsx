"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, ChevronLeft } from "lucide-react"
import { DEMO_MEMBERS } from "@/app/demo/_data/fixtures"
import { V2Avatar, avatarSeed } from "@/components/v2/ui/v2-avatar"
import { formatCurrency } from "@/lib/constants/currencies"

/**
 * Demo-only: the shipped footer hides the split error, so a disabled primary
 * action has no visible reason. The after side keeps the same disabled state
 * but puts the first blocker in the footer and scrolls to it on tap.
 *
 * The frame is a focused preview, not the real form: the amount, payer and
 * error are fixed so the comparison is stable.
 */

const AMOUNT = 600
const FIXED_AMOUNT = 800

export function CtaDemo({ view }: { view: "before" | "after" }) {
  const errorRef = useRef<HTMLDivElement>(null)
  const highlightTimer = useRef<number | null>(null)
  const [highlight, setHighlight] = useState(false)

  useEffect(
    () => () => {
      if (highlightTimer.current) window.clearTimeout(highlightTimer.current)
    },
    [],
  )

  const showError = () => {
    errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    setHighlight(true)
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current)
    highlightTimer.current = window.setTimeout(() => setHighlight(false), 1800)
  }

  return (
    <div className="relative mx-4 flex h-[440px] flex-col overflow-hidden rounded-v2-lg border border-v2-line bg-v2-paper shadow-v2-card">
      <div className="flex items-center gap-2 border-b border-v2-line px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-v2-line bg-v2-surface text-v2-ink-muted">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="text-[15px] font-semibold text-v2-ink">新增支出</span>
        <span className="ml-auto text-[11px] text-v2-ink-muted">重點預覽</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="rounded-v2-md bg-v2-lake-soft px-4 py-3">
          <p className="m-0 text-[11px] font-semibold text-v2-ink-muted">總金額</p>
          <p className="m-0 mt-0.5 font-v2-serif text-[28px] font-bold leading-9 tabular-nums text-v2-ink">
            {formatCurrency(AMOUNT, "TWD")}
          </p>
        </div>

        <div className="mt-3 rounded-v2-md border border-v2-line bg-v2-surface px-3.5 py-3">
          <p className="m-0 text-[11px] font-semibold text-v2-ink-muted">描述</p>
          <p className="m-0 mt-0.5 text-[13px] font-semibold text-v2-ink">一蘭拉麵晚餐</p>
        </div>

        <div className="mt-2 flex items-center gap-3 rounded-v2-md border border-v2-line bg-v2-surface px-3.5 py-3">
          <V2Avatar image={null} name="我" seed="me" variant="brand" className="h-8 w-8 rounded-full" fallbackClassName="text-[11px] font-bold" />
          <span className="min-w-0 flex-1 text-[13px] font-semibold text-v2-ink">我付款</span>
          <span className="text-[12px] font-bold tabular-nums text-v2-ink">{formatCurrency(AMOUNT, "TWD")}</span>
        </div>

        <div className="mt-3 rounded-v2-md border border-v2-line bg-v2-surface p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="m-0 text-[13px] font-bold text-v2-lake">誰一起分</p>
            <span className="text-[11px] font-semibold text-v2-danger">4 人 · 阿明固定 {formatCurrency(FIXED_AMOUNT, "TWD")}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <AvatarStack />
            <span className="text-[12px] text-v2-ink-muted">共 4 人分攤</span>
          </div>
          <div className="mt-2 flex items-center gap-3 rounded-v2-md border border-v2-danger-border bg-v2-danger-wash px-3 py-2.5">
            <V2Avatar image={null} name="阿明" seed="ming" className="h-8 w-8 rounded-full" fallbackClassName="text-[11px] font-bold" />
            <span className="min-w-0 flex-1 text-[13px] font-semibold text-v2-ink">阿明</span>
            <span className="text-[12px] font-bold tabular-nums text-v2-danger">
              固定 {formatCurrency(FIXED_AMOUNT, "TWD")}
            </span>
          </div>
        </div>

        <div
          ref={errorRef}
          className={`mt-3 rounded-v2-md border px-3 py-2.5 transition-colors duration-300 ${
            highlight ? "border-v2-danger bg-v2-danger-tint" : "border-v2-danger-border bg-v2-danger-wash"
          }`}
        >
          <p role="alert" className="m-0 text-[12px] font-semibold leading-5 text-v2-danger">
            阿明的固定金額 {formatCurrency(FIXED_AMOUNT, "TWD")} 超過支出總額 {formatCurrency(AMOUNT, "TWD")}，請調低
          </p>
          <p className="m-0 mt-1 text-[11px] leading-4 text-v2-ink-muted">
            把固定金額降到總額以下，或改成均分。
          </p>
        </div>
        <div className="h-4" aria-hidden="true" />
      </div>

      <div className="border-t border-v2-line bg-v2-surface px-4 py-3">
        {view === "after" && (
          <button
            type="button"
            onClick={showError}
            className="mb-2 flex min-h-[44px] w-full items-start gap-2 rounded-v2-sm bg-v2-danger-wash px-2.5 py-2 text-left transition-colors duration-150 hover:bg-v2-danger-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-danger motion-reduce:transition-none"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-v2-danger" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-[12px] font-semibold leading-4 text-v2-danger">
              阿明的固定金額比總額多 {formatCurrency(FIXED_AMOUNT - AMOUNT, "TWD")}
              <span className="ml-1 underline underline-offset-2">查看</span>
            </span>
          </button>
        )}
        <button
          type="button"
          disabled
          className="w-full rounded-v2-md bg-v2-lake py-[15px] text-[15px] font-bold text-v2-on-lake opacity-40"
        >
          新增支出 · {formatCurrency(AMOUNT, "TWD")}
        </button>
      </div>
    </div>
  )
}

function AvatarStack() {
  const shown = DEMO_MEMBERS.slice(0, 3)
  const extra = DEMO_MEMBERS.length - shown.length
  return (
    <span className="flex shrink-0" aria-hidden="true">
      {shown.map((member, index) => (
        <V2Avatar
          key={member.id}
          image={member.image ?? null}
          name={member.displayName}
          seed={avatarSeed(member.userId, member.id)}
          variant={member.id === "me" ? "brand" : undefined}
          className={`h-6 w-6 rounded-full border-2 border-v2-surface ${index > 0 ? "-ml-1.5" : ""}`}
          fallbackClassName="text-[8px] font-bold"
        />
      ))}
      {extra > 0 && (
        <span className="-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-v2-surface bg-v2-line text-[9px] font-bold text-v2-ink-muted">
          +{extra}
        </span>
      )}
    </span>
  )
}
