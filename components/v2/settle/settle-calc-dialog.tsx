"use client"

import { useEffect, useId, useRef } from "react"
import { ArrowRight, CheckCircle2, ReceiptText, X } from "lucide-react"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import type { SettleData, SettleExpenseDetail } from "@/lib/hooks/useSettlement"
import { useDismiss } from "@/components/v2/use-dismiss"

interface SettlementCalcDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: SettleData
}

const STEP_BADGE =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-v2-lake text-[13px] font-bold text-v2-paper"

function StepBadge({ n }: { n: number }) {
  return <span className={STEP_BADGE}>{n}</span>
}

// The 分攤 line matches the design's "share（total ÷ n）" only when every
// participant owes the same amount; otherwise list each member's share (the
// data model allows arbitrary per-participant amounts).
function splitLine(expense: SettleExpenseDetail, currency: string): string {
  const participants = expense.participants ?? []
  if (participants.length === 0) return "—"
  const first = participants[0].convertedShareAmount
  const allEqual = participants.every((p) => Math.abs(p.convertedShareAmount - first) < 0.005)
  if (allEqual) {
    return `${formatCurrency(first, currency)}（${expense.convertedAmount} ÷ ${participants.length}）`
  }
  return participants
    .map((p) => `${p.displayName} ${formatCurrency(p.convertedShareAmount, currency)}`)
    .join("、")
}

// "計算過程" dialog, ported from the shared v1 dialog so it can be rendered
// inline inside the UiV2Scope tree (v2 tokens resolve; no shadcn Portal).
export function SettlementCalcDialog({ open, onOpenChange, data }: SettlementCalcDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useDismiss(cardRef, () => onOpenChange(false), open)

  useEffect(() => {
    if (open) cardRef.current?.focus()
  }, [open])

  if (!open) return null

  const { summary, balances, settlements } = data
  const currency = summary.currency || DEFAULT_CURRENCY

  return (
    <div
      data-testid="settle-calc-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-v2-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false)
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative max-h-[85vh] w-[350px] max-w-[calc(100vw-40px)] overflow-y-auto rounded-[20px] bg-v2-surface p-[22px] outline-none"
      >
        <button
          type="button"
          aria-label="關閉"
          onClick={() => onOpenChange(false)}
          className="absolute right-[14px] top-[14px] flex h-6 w-6 items-center justify-center rounded-full text-v2-ink-subtle hover:text-v2-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <h2 id={titleId} className="mb-[18px] mt-0 flex items-center gap-2 font-v2-serif text-[17px] font-bold">
          <ReceiptText className="h-[18px] w-[18px] text-v2-lake" strokeWidth={2} aria-hidden="true" />
          計算過程
        </h2>

        {/* Step 1: 支出明細 */}
        <div className="mb-2.5 flex items-center gap-2">
          <StepBadge n={1} />
          <p className="m-0 text-[13px] font-bold text-v2-lake">支出明細（共 {data.expenseDetails?.length || 0} 筆）</p>
        </div>
        <div className="mb-[18px] ml-8 flex max-h-[150px] flex-col gap-1.5 overflow-y-auto v2-scroll">
          {data.expenseDetails && data.expenseDetails.length > 0 ? (
            data.expenseDetails.map((expense) => (
              <div key={expense.id} className="rounded-[10px] bg-v2-paper px-3 py-[9px]">
                <p className="mb-[3px] mt-0 text-[13px] font-semibold">
                  {expense.description} ·{" "}
                  {expense.currency !== currency
                    ? `${formatCurrency(expense.amount, expense.currency)} → `
                    : ""}
                  {formatCurrency(expense.convertedAmount, currency)}
                </p>
                <p className="m-0 text-[11px] text-v2-lake">付款：{expense.payer.displayName}</p>
                <p data-testid="split-line" className="m-0 text-[11px] text-v2-gold">
                  {`分攤：${splitLine(expense, currency)}`}
                </p>
              </div>
            ))
          ) : (
            <p className="m-0 text-[11px] text-v2-ink-subtle">尚無支出記錄</p>
          )}
        </div>

        {/* Step 2: 計算各人總額 */}
        <div className="mb-2.5 flex items-center gap-2">
          <StepBadge n={2} />
          <p className="m-0 text-[13px] font-bold text-v2-lake">計算各人總額</p>
        </div>
        <div className="mb-[18px] ml-8">
          <table className="w-full overflow-hidden rounded-[10px] bg-v2-paper text-[12px]">
            <thead className="bg-v2-lake-soft">
              <tr>
                <th className="p-[7px] text-left text-[11px] font-medium text-v2-lake">成員</th>
                <th className="p-[7px] text-left text-[11px] font-medium text-v2-lake">已付</th>
                <th className="p-[7px] text-left text-[11px] font-medium text-v2-lake">應付</th>
                <th className="p-[7px] text-left text-[11px] font-medium text-v2-lake">餘額</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr key={b.memberId}>
                  <td className="p-[7px]">{b.displayName}</td>
                  <td className="p-[7px] text-v2-lake">{formatCurrency(b.totalPaid, currency)}</td>
                  <td className="p-[7px] text-v2-gold">{formatCurrency(b.totalShare, currency)}</td>
                  <td
                    data-testid={`balance-${b.memberId}`}
                    className={`p-[7px] font-medium ${b.balance < -0.01 ? "text-v2-danger" : "text-v2-lake"}`}
                  >
                    {b.balance > 0.01 ? "+" : ""}
                    {formatCurrency(b.balance, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="m-0 mt-2 text-[10px] text-v2-ink-subtle">餘額 = 已付金額 − 應付金額（正數表示應收回，負數表示需付出）</p>
        </div>

        {/* Step 3: 結算方案 */}
        <div className="mb-2.5 flex items-center gap-2">
          <StepBadge n={3} />
          <p className="m-0 text-[13px] font-bold text-v2-lake">結算方案</p>
        </div>
        <div className="ml-8">
          {settlements.length > 0 ? (
            <>
              <div className="rounded-[10px] bg-v2-lake-soft px-3 py-2.5">
                {settlements.map((s, idx) => (
                  <div
                    key={`${s.from.memberId}-${s.to.memberId}-${idx}`}
                    data-testid={`plan-${idx}`}
                    className={`flex items-center gap-1.5 text-[13px] ${
                      idx > 0 ? "mt-1.5 border-t border-v2-lake-border pt-1.5" : ""
                    }`}
                  >
                    <span className="text-v2-ink-subtle">{idx + 1}.</span>
                    <span className="font-medium text-v2-danger">{s.from.displayName}</span>
                    <ArrowRight className="h-[13px] w-[13px] shrink-0 text-v2-ink-muted" strokeWidth={2} aria-hidden="true" />
                    <span className="font-medium text-v2-lake">{s.to.displayName}</span>
                    <span className="ml-auto font-bold text-v2-lake">{formatCurrency(s.amount, currency)}</span>
                  </div>
                ))}
              </div>
              <p className="mb-0 mt-1.5 text-[10px] text-v2-ink-subtle">
                以上為最少轉帳次數的結算方案，共需 {settlements.length} 筆轉帳
              </p>
            </>
          ) : (
            <div className="rounded-[10px] bg-v2-lake-soft px-3 py-4 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-v2-lake" aria-hidden="true" />
              <p className="m-0 text-[13px] text-v2-lake">
                {summary.totalExpenses === 0 ? "尚無支出記錄" : "所有人都已結清，無需轉帳！"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
