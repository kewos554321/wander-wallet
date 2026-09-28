"use client"

import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { CalendarIcon, Trash2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { CurrencySelect } from "@/components/ui/currency-select"
import { ImagePicker } from "@/components/ui/image-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LocationPicker } from "@/components/location-picker"
import { formatAmount, type CurrencyCode } from "@/lib/constants/currencies"
import { computeShares } from "@/lib/expense-split"
import { toMoneyInput } from "@/lib/money-input"
import type { QuickItem } from "@/lib/quick-expense/draft"
import { CategoryPicker } from "@/components/v2/expense-form/category-picker"
import { memberPillClass, memberTone } from "@/components/v2/expense-form/payer-picker"

type Member = { id: string; displayName: string }
const sectionTitle = "mb-2.5 text-sm font-medium leading-5 tracking-[.1px]"

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

export function QuickItemCard({ item, members, onChange, onRemove }: { item: QuickItem; members: Member[]; onChange: (patch: Partial<QuickItem>) => void; onRemove: () => void }) {
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
      <div className="mx-4 mb-4 flex items-center gap-2 rounded-2xl border border-v2-line bg-v2-surface px-3.5 py-3">
        <CurrencySelect value={item.currency as CurrencyCode} onChange={(v) => onChange({ currency: v })} showName={false} />
        <input
          aria-label="金額"
          inputMode="decimal"
          value={item.amount}
          onChange={(e) => {
            const v = toMoneyInput(e.target.value)
            if (v !== null) onChange({ amount: v })
          }}
          className="min-w-0 flex-1 bg-transparent text-right text-2xl font-bold outline-none"
        />
      </div>

      <div className="mx-4 mb-4">
        <p className={sectionTitle}>描述</p>
        <input
          aria-label="描述"
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="w-full rounded-xl border border-v2-line bg-v2-surface px-3.5 py-3 text-[13px] outline-none"
        />
      </div>

      <CategoryPicker value={item.category} onChange={(c) => onChange({ category: c as QuickItem["category"] })} />

      <div role="group" aria-label="付款成員" className="mx-4 mb-4">
        <p className={sectionTitle}>誰付的錢？</p>
        <div className="flex flex-wrap gap-2">
          {members.map((m, i) => (
            <MemberPill key={m.id} member={m} index={i} selected={item.payerId === m.id} onClick={() => onChange({ payerId: m.id })} />
          ))}
        </div>
      </div>

      <div role="group" aria-label="分攤成員" className="mx-4 mb-4">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="m-0 text-sm font-medium">
            {`幫誰付？（${item.participantIds.length} 人均分 · 每人 ${formatAmount(perHead, item.currency)}）`}
          </p>
          <button type="button" onClick={() => onChange({ participantIds: allSelected ? [] : members.map((m) => m.id) })} className="shrink-0 text-xs font-bold text-v2-lake">
            {allSelected ? "取消全選" : "全選"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.map((m, i) => (
            <MemberPill key={m.id} member={m} index={i} selected={item.participantIds.includes(m.id)} onClick={() => toggleParticipant(m.id)} />
          ))}
        </div>
      </div>

      <div className="mx-4 mb-4">
        <p className={sectionTitle}>支出日期</p>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="flex w-full items-center gap-2 rounded-xl border border-v2-line bg-v2-surface px-3.5 py-3 text-left text-[13px]">
              <CalendarIcon className="h-4 w-4 text-v2-ink-muted" aria-hidden="true" />
              <span>{format(item.expenseDate, "yyyy/MM/dd（EEEEE）", { locale: zhTW })}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={item.expenseDate} onSelect={(d) => d && onChange({ expenseDate: d })} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="mx-4 mb-4">
        <p className={sectionTitle}>消費地點</p>
        <LocationPicker
          value={{ location: item.location, latitude: item.latitude, longitude: item.longitude }}
          onChange={(v) => onChange({ location: v.location, latitude: v.latitude, longitude: v.longitude })}
        />
      </div>

      <div className="mx-4 mb-4">
        <p className={sectionTitle}>收據/消費圖片</p>
        <ImagePicker value={item.image} onChange={(v) => onChange({ image: v })} />
      </div>

      <button type="button" onClick={onRemove} className="mx-4 mb-4 flex w-[calc(100%-2rem)] items-center justify-center gap-1.5 rounded-[14px] border border-v2-line bg-v2-surface py-3 text-[13px] font-bold text-v2-danger">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        刪除此筆
      </button>
    </div>
  )
}
