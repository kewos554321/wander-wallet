"use client"

import { useState } from "react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { ImagePicker } from "@/components/ui/image-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatAmount } from "@/lib/constants/currencies"
import { computeShares } from "@/lib/expense-split"
import { toMoneyInput } from "@/lib/money-input"
import type { QuickItem } from "@/lib/quick-expense/draft"
import { AmountCard } from "@/components/v2/expense-form/amount-card"
import { CalculatorPad } from "@/components/v2/expense-form/calculator-pad"
import { CategoryPicker } from "@/components/v2/expense-form/category-picker"
import { LocationPickerV2 } from "@/components/v2/expense-form/location-picker-v2"
import { memberPillClass, memberTone, PayerPicker } from "@/components/v2/expense-form/payer-picker"
import { SECTION_CARD, SECTION_TITLE } from "@/components/v2/expense-form/section-card"

type Member = { id: string; displayName: string }

function MemberPill({ member, index, selected, onClick }: { member: Member; index: number; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={memberPillClass(selected)}>
      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${memberTone(index)}`} aria-hidden="true">
        {member.displayName.charAt(0)}
      </span>
      <span className="text-xs font-semibold">{member.displayName}</span>
    </button>
  )
}

// Rebuilt on the shared A3 cards: the amount uses AmountCard (+ CalculatorPad),
// the category uses CategoryPicker and the payer uses PayerPicker. Split stays
// equal-split pills only because QuickItem carries just `participantIds`.
export function QuickItemCard({ item, members, onChange }: { item: QuickItem; members: Member[]; onChange: (patch: Partial<QuickItem>) => void }) {
  const [showCalculator, setShowCalculator] = useState(false)
  const amount = Number(item.amount) || 0
  const perHead = computeShares({ amount, participantIds: item.participantIds, personalItems: {}, customShares: {} }).at(-1)?.shareAmount ?? 0
  const allSelected = members.every((m) => item.participantIds.includes(m.id))
  const toggleParticipant = (id: string) =>
    onChange({
      participantIds: item.participantIds.includes(id)
        ? item.participantIds.filter((x) => x !== id)
        : members.map((m) => m.id).filter((m) => m === id || item.participantIds.includes(m)),
    })

  return (
    <div>
      <AmountCard
        amount={item.amount}
        currency={item.currency}
        onAmount={(v) => {
          const m = toMoneyInput(v)
          if (m !== null) onChange({ amount: m })
        }}
        onCurrency={(c) => onChange({ currency: c })}
        calculatorOpen={showCalculator}
        onToggleCalculator={() => setShowCalculator((v) => !v)}
        calculator={
          <CalculatorPad
            initialValue={item.amount}
            onApply={(value: number) => {
              onChange({ amount: String(value) })
              setShowCalculator(false)
            }}
            onClose={() => setShowCalculator(false)}
          />
        }
      />

      <div className={`${SECTION_CARD} mt-3.5`}>
        <label htmlFor="v2-quick-desc" className={`block ${SECTION_TITLE} mb-1.5`}>
          描述
        </label>
        <input
          id="v2-quick-desc"
          aria-label="描述"
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="w-full rounded-xl border border-v2-line bg-v2-paper px-3.5 py-3 text-[13px] outline-none"
        />
      </div>

      <CategoryPicker value={item.category} onChange={(c) => onChange({ category: c as QuickItem["category"] })} />

      <PayerPicker members={members} value={item.payerId} onChange={(id) => onChange({ payerId: id })} amount={amount} currency={item.currency} />

      <div className={SECTION_CARD}>
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className={`m-0 ${SECTION_TITLE}`}>
            {`幫誰付？（${item.participantIds.length} 人均分 · 每人 ${formatAmount(perHead, item.currency)}）`}
          </p>
          <button type="button" onClick={() => onChange({ participantIds: allSelected ? [] : members.map((m) => m.id) })} className="shrink-0 text-xs font-bold text-v2-lake">
            {allSelected ? "取消全選" : "全選"}
          </button>
        </div>
        <div role="group" aria-label="分攤成員" className="flex flex-wrap gap-2">
          {members.map((m, i) => (
            <MemberPill key={m.id} member={m} index={i} selected={item.participantIds.includes(m.id)} onClick={() => toggleParticipant(m.id)} />
          ))}
        </div>
      </div>

      <div className={SECTION_CARD}>
        <p className={`mb-2 ${SECTION_TITLE}`}>支出日期</p>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="flex w-full items-center gap-2 rounded-xl border border-v2-line bg-v2-paper px-3.5 py-3 text-left text-[13px]">
              <CalendarIcon className="h-[15px] w-[15px] text-v2-ink-muted" aria-hidden="true" />
              <span>{format(item.expenseDate, "yyyy/MM/dd（EEEEE）", { locale: zhTW })}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={item.expenseDate} onSelect={(d) => d && onChange({ expenseDate: d })} />
          </PopoverContent>
        </Popover>
      </div>

      <div className={SECTION_CARD}>
        <p className={`mb-2 ${SECTION_TITLE}`}>消費地點</p>
        <LocationPickerV2
          value={{ location: item.location, latitude: item.latitude, longitude: item.longitude }}
          onChange={(v) => onChange({ location: v.location, latitude: v.latitude, longitude: v.longitude })}
        />
      </div>

      <div className={SECTION_CARD}>
        <p className={`mb-2 ${SECTION_TITLE}`}>收據/消費圖片</p>
        <ImagePicker value={item.image} onChange={(v) => onChange({ image: v })} />
      </div>
    </div>
  )
}
