"use client"

import { useEffect, useId, useRef, useState } from "react"
import { ArrowRight, CheckCircle2, ReceiptText, User, X } from "lucide-react"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import type { SettleData } from "@/lib/hooks/useSettlement"
import { V2Avatar } from "@/components/v2/ui/v2-avatar"
import { useDismiss } from "@/components/v2/use-dismiss"
import { useDialogHistory } from "@/components/v2/use-dialog-history"

interface SettlementCalcDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: SettleData
  currentMemberId?: string | null
  placeholderMemberIds?: ReadonlySet<string>
  memberSeeds?: ReadonlyMap<string, string>
}

const STEP_BADGE =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-v2-lake text-[13px] font-bold text-v2-paper"

function StepBadge({ n }: { n: number }) {
  return <span className={STEP_BADGE}>{n}</span>
}

// Keep the sign in one place: +TWD 1,234 / -TWD 1,234 / TWD 0.
function signedCurrency(amount: number, currency: string): string {
  if (Math.abs(amount) < 0.005) return formatCurrency(0, currency)
  return `${amount > 0 ? "+" : "-"}${formatCurrency(Math.abs(amount), currency)}`
}

// "計算過程" dialog, ported from the original shared dialog so it can be rendered
// inline inside the UiV2Scope tree (v2 tokens resolve; no shadcn Portal).
export function SettlementCalcDialog({ open, onOpenChange, data, currentMemberId, placeholderMemberIds, memberSeeds }: SettlementCalcDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [onlyMe, setOnlyMe] = useState(false)
  useDismiss(cardRef, () => onOpenChange(false), open)
  useDialogHistory(open, () => onOpenChange(false), "settle-calc")

  useEffect(() => {
    if (open) cardRef.current?.focus()
  }, [open])

  if (!open) return null

  const { summary, balances, settlements } = data
  const currency = summary.currency || DEFAULT_CURRENCY
  const canFilter = Boolean(currentMemberId)
  const filtering = onlyMe && canFilter
  const expenseDetails = data.expenseDetails ?? []
  const visibleExpenses = filtering
    ? expenseDetails.filter(
        (expense) =>
          expense.payers.some((payer) => payer.memberId === currentMemberId) ||
          expense.participants.some((participant) => participant.memberId === currentMemberId)
      )
    : expenseDetails
  const visibleBalances = filtering ? balances.filter((balance) => balance.memberId === currentMemberId) : balances
  const visibleSettlements = filtering
    ? settlements.filter(
        (settlement) =>
          settlement.from.memberId === currentMemberId || settlement.to.memberId === currentMemberId
      )
    : settlements

  return (
    <div
      data-testid="settle-calc-overlay"
      className="fixed inset-0 z-50 flex justify-center bg-v2-overlay"
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
        className="relative h-dvh w-full max-w-md overflow-y-auto bg-v2-surface p-[22px] outline-none"
      >
        <button
          type="button"
          aria-label="關閉"
          onClick={() => onOpenChange(false)}
          className="absolute right-[14px] top-[14px] flex h-6 w-6 items-center justify-center rounded-full text-v2-ink-muted hover:text-v2-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="mb-[18px] flex items-center justify-between gap-2 pr-8">
          <h2 id={titleId} className="m-0 flex items-center gap-2 font-v2-serif text-[17px] font-bold">
            <ReceiptText className="h-[18px] w-[18px] text-v2-lake" strokeWidth={2} aria-hidden="true" />
            計算過程
          </h2>
          {canFilter && (
            <button
              type="button"
              data-testid="only-me-toggle"
              aria-pressed={onlyMe}
              onClick={() => setOnlyMe((value) => !value)}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none ${
                onlyMe
                  ? "border-v2-lake bg-v2-lake-soft text-v2-lake"
                  : "border-v2-line bg-v2-surface text-v2-ink-muted hover:bg-v2-sand"
              }`}
            >
              <User className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
              只看我
            </button>
          )}
        </div>

        {/* Step 1: 支出明細 */}
        <div className="mb-2.5 flex items-center gap-2">
          <StepBadge n={1} />
          <p className="m-0 text-[13px] font-bold text-v2-lake">支出明細（共 {visibleExpenses.length} 筆）</p>
        </div>
        <div data-testid="expense-detail-list" className="mb-[18px] ml-8 flex max-h-[40vh] flex-col gap-1.5 overflow-y-auto v2-scroll">
          {visibleExpenses.length > 0 ? (
            visibleExpenses.map((expense) => {
              const visiblePayers = filtering
                ? expense.payers.filter((payer) => payer.memberId === currentMemberId)
                : expense.payers
              const visibleParticipants = filtering
                ? expense.participants.filter((participant) => participant.memberId === currentMemberId)
                : expense.participants

              return (
                <div key={expense.id} className="rounded-v2-sm bg-v2-paper px-3 py-[9px]">
                  <p className="mb-[3px] mt-0 text-[13px] font-semibold">
                    {expense.description} ·{" "}
                    {expense.currency !== currency
                      ? `${formatCurrency(expense.amount, expense.currency)} → `
                      : ""}
                    {formatCurrency(expense.convertedAmount, currency)}
                  </p>
                  {visiblePayers.length > 0 && (
                    <p data-testid="payer-line" className="m-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-v2-lake">
                      <span className="text-v2-ink-muted">{filtering ? "我付款：" : "付款："}</span>
                      {visiblePayers.map((p, i) => (
                        <span key={p.memberId} className="inline-flex items-center gap-1">
                          {i > 0 ? <span aria-hidden="true">、</span> : null}
                          <V2Avatar image={p.userImage ?? null} name={p.displayName} seed={memberSeeds?.get(p.memberId) ?? p.memberId} variant={p.memberId === currentMemberId ? "brand" : undefined} placeholder={placeholderMemberIds?.has(p.memberId)} className="h-4 w-4 rounded-full" fallbackClassName="text-[8px] font-bold" />
                          {!filtering && <span data-payer-name className="text-v2-ink">{p.displayName}</span>}
                          <span data-payer-amount className="text-v2-gold">{formatCurrency(p.convertedAmount, currency)}</span>
                        </span>
                      ))}
                    </p>
                  )}
                  {(!filtering || visibleParticipants.length > 0) && (
                    <p data-testid="split-line" className="m-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-v2-ink">
                      <span className="text-v2-ink-muted">{filtering ? "我分攤：" : "分攤："}</span>
                      {visibleParticipants.length > 0 ? (
                        visibleParticipants.map((p, i) => (
                          <span key={p.memberId} data-split-member className="inline-flex items-center gap-1">
                            {i > 0 ? <span aria-hidden="true">、</span> : null}
                            <V2Avatar image={p.userImage ?? null} name={p.displayName} seed={memberSeeds?.get(p.memberId) ?? p.memberId} variant={p.memberId === currentMemberId ? "brand" : undefined} placeholder={placeholderMemberIds?.has(p.memberId)} className="h-4 w-4 rounded-full" fallbackClassName="text-[8px] font-bold" />
                            {!filtering && <span data-split-name className="text-v2-ink">{p.displayName}</span>}
                            <span data-split-amount className="text-v2-gold">{formatCurrency(p.convertedShareAmount, currency)}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-v2-ink-muted">—</span>
                      )}
                    </p>
                  )}
                </div>
              )
            })
          ) : (
            <p className="m-0 text-[11px] text-v2-ink-muted">
              {filtering && expenseDetails.length > 0 ? "沒有與我相關的支出" : "尚無支出記錄"}
            </p>
          )}
        </div>

        {/* Step 2: 計算各人總額 */}
        <div className="mb-2.5 flex items-center gap-2">
          <StepBadge n={2} />
          <p className="m-0 text-[13px] font-bold text-v2-lake">計算各人總額</p>
        </div>
        <div className="mb-[18px] ml-8">
          <div data-testid="balance-table-scroll" className="overflow-x-auto rounded-v2-sm">
            <table className="w-full min-w-max bg-v2-paper text-[12px]">
              <thead className="bg-v2-lake-soft">
                <tr>
                  <th className="whitespace-nowrap p-[7px] text-left text-[11px] font-medium text-v2-lake">旅伴</th>
                  <th className="whitespace-nowrap p-[7px] text-left text-[11px] font-medium text-v2-lake">已付</th>
                  <th className="whitespace-nowrap p-[7px] text-left text-[11px] font-medium text-v2-lake">應付</th>
                  <th className="whitespace-nowrap p-[7px] text-left text-[11px] font-medium text-v2-lake">餘額</th>
                </tr>
              </thead>
              <tbody>
                {visibleBalances.length > 0 ? (
                  visibleBalances.map((b) => (
                    <tr key={b.memberId}>
                      <td className="whitespace-nowrap p-[7px]">{b.displayName}</td>
                      <td className="whitespace-nowrap p-[7px] text-v2-lake">{formatCurrency(b.totalPaid, currency)}</td>
                      <td className="whitespace-nowrap p-[7px] text-v2-gold">{formatCurrency(b.totalShare, currency)}</td>
                      <td
                        data-testid={`balance-${b.memberId}`}
                        className={`whitespace-nowrap p-[7px] font-medium ${
                          b.balance < -0.005 ? "text-v2-danger" : b.balance > 0.005 ? "text-v2-lake" : "text-v2-ink-muted"
                        }`}
                      >
                        {signedCurrency(b.balance, currency)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-[9px] text-center text-[11px] text-v2-ink-muted">
                      找不到你的旅伴資料
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="m-0 mt-2 text-[10px] text-v2-ink-muted">餘額 = 已付金額 − 應付金額（正數表示應收回，負數表示需付出）</p>
        </div>

        {/* Step 3: 結算方案 */}
        <div className="mb-2.5 flex items-center gap-2">
          <StepBadge n={3} />
          <p className="m-0 text-[13px] font-bold text-v2-lake">結算方案</p>
        </div>
        <div className="ml-8">
          {visibleSettlements.length > 0 ? (
            <>
              <div className="rounded-v2-sm bg-v2-lake-soft px-3 py-2.5">
                {visibleSettlements.map((s, idx) => (
                  <div
                    key={`${s.from.memberId}-${s.to.memberId}-${idx}`}
                    data-testid={`plan-${idx}`}
                    className={`flex items-center gap-1.5 text-[13px] ${
                      idx > 0 ? "mt-1.5 border-t border-v2-lake-border pt-1.5" : ""
                    }`}
                  >
                    <span className="text-v2-ink-muted">{idx + 1}.</span>
                    <span className="font-medium text-v2-danger">{s.from.displayName}</span>
                    <ArrowRight className="h-[13px] w-[13px] shrink-0 text-v2-ink-muted" strokeWidth={2} aria-hidden="true" />
                    <span className="font-medium text-v2-lake">{s.to.displayName}</span>
                    <span className="ml-auto font-bold text-v2-lake">{formatCurrency(s.amount, currency)}</span>
                  </div>
                ))}
              </div>
              <p className="mb-0 mt-1.5 text-[10px] text-v2-ink-muted">
                {filtering
                  ? `與你有關的轉帳共 ${visibleSettlements.length} 筆`
                  : `以上為最少轉帳次數的結算方案，共需 ${visibleSettlements.length} 筆轉帳`}
              </p>
            </>
          ) : (
            <div className="rounded-v2-sm bg-v2-lake-soft px-3 py-4 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-v2-lake" aria-hidden="true" />
              <p className="m-0 text-[13px] text-v2-lake">
                {settlements.length > 0
                  ? filtering
                    ? "目前沒有與你有關的轉帳"
                    : "所有人都已結清，無需轉帳！"
                  : summary.totalExpenses === 0
                    ? "尚無支出記錄"
                    : "所有人都已結清，無需轉帳！"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
