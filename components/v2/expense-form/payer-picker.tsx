import { CheckCircle2 } from "lucide-react"
import { formatAmount } from "@/lib/constants/currencies"
import type { DraftMember } from "./use-expense-draft"
import { SECTION_CARD, SECTION_TITLE } from "./section-card"

const AVATAR_TONES = ["bg-v2-lake-tint text-v2-lake", "bg-v2-coral-soft text-v2-coral-strong", "bg-v2-plum-soft text-v2-plum", "bg-v2-rose-soft text-v2-rose"]

// Shared member pill look for the payer, personal-item and shared-pool pickers.
export function memberPillClass(selected: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full px-3.5 py-[5px] ${
    selected ? "border border-v2-lake bg-v2-lake text-v2-on-lake" : "border border-v2-lake-border bg-v2-lake-soft text-v2-ink opacity-50"
  }`
}

export function memberTone(index: number) {
  return AVATAR_TONES[index % AVATAR_TONES.length]
}

export function PayerPicker({
  members,
  value,
  onChange,
  amount,
  currency,
}: {
  members: DraftMember[]
  value: string
  onChange: (id: string) => void
  amount: number
  currency: string
}) {
  const paid = members.filter((m) => m.id === value)
  const money = (n: number) => `$${formatAmount(Math.round(n * 100) / 100, currency)}`
  const nameOf = (id: string) => members.find((m) => m.id === id)?.displayName ?? ""

  return (
    <fieldset className={SECTION_CARD}>
      <legend className={`${SECTION_TITLE} mb-2.5`}>付款人</legend>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="m-0 text-xs font-semibold text-v2-ink-muted">付款明細</p>
      </div>

      <div className="mb-2.5 flex flex-wrap gap-2">
        {members.map((m, i) => {
          const checked = value === m.id
          return (
            <label key={m.id} className={`cursor-pointer ${memberPillClass(checked)}`}>
              <input
                type="radio"
                name="v2-payer"
                className="sr-only"
                checked={checked}
                onChange={() => onChange(m.id)}
                aria-label={m.displayName}
              />
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${memberTone(i)}`} aria-hidden="true">
                {m.displayName.charAt(0)}
              </span>
              <span className="text-xs font-semibold">{m.displayName}</span>
            </label>
          )
        })}
      </div>

      {value && (
        <div className="overflow-hidden rounded-[14px] border border-v2-line bg-v2-paper">
          <div className="flex items-center gap-2.5 bg-v2-lake-soft px-3.5 py-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${memberTone(
                members.findIndex((m) => m.id === value)
              )}`}
              aria-hidden="true"
            >
              {nameOf(value).charAt(0)}
            </span>
            <span className="flex flex-1 items-center justify-between gap-2">
              <span className="text-[13px] font-semibold">{nameOf(value)}</span>
              <span className="rounded-lg border border-v2-lake-border bg-v2-surface px-2.5 py-1.5 text-[13px] font-bold">
                {money(amount)}
              </span>
            </span>
          </div>
        </div>
      )}

      <div className="mt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-v2-ink-muted">已選 {paid.length} 人</span>
          <span className="flex items-center gap-1 text-xs font-bold text-v2-link">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            金額相符
          </span>
        </div>
        <p className="mt-[3px] break-words text-xs leading-normal text-v2-ink-muted">
          {money(amount)} = {money(amount)} / {money(amount)}
        </p>
      </div>
    </fieldset>
  )
}
