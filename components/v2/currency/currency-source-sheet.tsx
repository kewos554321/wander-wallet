"use client"

import { useEffect, useId, useRef } from "react"
import { AlertTriangle, RefreshCw, X } from "lucide-react"
import { useDismiss } from "@/components/v2/use-dismiss"
import { cn } from "@/lib/utils"

interface CurrencySourceSheetProps {
  open: boolean
  onClose: () => void
  dataDate: string | null
  usingFallback: boolean
  ratesError: string | null
  loading: boolean
  onRefresh: () => void
}

/**
 * Secondary detail for the rates page: provider names, freshness and the
 * disclaimer live here so the main screen stays focused on the rates.
 */
export function CurrencySourceSheet({
  open,
  onClose,
  dataDate,
  usingFallback,
  ratesError,
  loading,
  onRefresh,
}: CurrencySourceSheetProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useDismiss(cardRef, onClose, open)

  useEffect(() => {
    if (open) cardRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-v2-overlay sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-md rounded-t-2xl bg-v2-surface p-5 outline-none sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="m-0 font-v2-serif text-[17px] font-bold text-v2-ink">
            資料來源
          </h2>
          <button
            type="button"
            aria-label="關閉資料來源"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-v2-ink-muted hover:text-v2-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <dl className="m-0 mt-4 text-[12px] leading-relaxed">
          <div>
            <dt className="m-0 text-v2-ink-muted">匯率</dt>
            <dd className="m-0 mt-0.5 text-v2-ink">
              <a
                href="https://frankfurter.dev"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-v2-lake underline underline-offset-2"
              >
                Frankfurter
              </a>
              <span className="text-v2-ink-muted">
                {" "}· 108 個央行／官方來源 · 交易日更新（週末／假日順延）
                {dataDate ? ` · 資料日期 ${dataDate}` : ""}
              </span>
            </dd>
          </div>
        </dl>

        {ratesError ? (
          <p
            role="alert"
            className="mt-4 flex items-start gap-1.5 rounded-v2-sm border border-v2-danger-border bg-v2-danger-tint px-2.5 py-2 text-[11px] leading-4 text-v2-danger-strong"
          >
            <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0" aria-hidden="true" />
            {ratesError}
          </p>
        ) : null}

        {usingFallback ? (
          <p
            role="status"
            className="mt-4 flex items-start gap-1.5 rounded-v2-sm border border-v2-danger-border bg-v2-danger-tint px-2.5 py-2 text-[11px] leading-4 text-v2-danger-strong"
          >
            <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0" aria-hidden="true" />
            目前使用備援匯率，可能非最新。
          </p>
        ) : null}

        <p className="m-0 mt-4 text-[11px] leading-relaxed text-v2-ink-muted">
          匯率為中間價，僅供參考，不含銀行價差與手續費；實際交易以銀行／發卡機構公告為準。
        </p>

        <button
          type="button"
          aria-label="重新整理匯率"
          onClick={onRefresh}
          disabled={loading}
          className="mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-v2-md border border-v2-line text-[13px] font-bold text-v2-ink transition-colors duration-150 hover:bg-v2-sand disabled:opacity-50 motion-reduce:transition-none"
        >
          <RefreshCw
            className={cn("h-4 w-4", loading && "animate-spin motion-reduce:animate-none")}
            aria-hidden="true"
          />
          {loading ? "更新中…" : "重新整理匯率"}
        </button>
      </div>
    </div>
  )
}
