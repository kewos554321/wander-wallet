"use client"

import { useState } from "react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toMoneyInput } from "@/lib/money-input"
import {
  deriveSplit,
  withAddedItem,
  withClearedCustomShare,
  withCustomShare,
  withPersonalAll,
  withPersonalMode,
  withPoolAll,
  withRemovedItem,
  withToggledPersonalMember,
  withToggledPool,
  withUpdatedItem,
  type SplitActions,
  type SplitDraft,
  type SplitState,
} from "@/lib/split-draft"
import { itemDerivedPayers, type QuickItem } from "@/lib/quick-expense/draft"
import { roundRateForDisplay, type PreviewRateInfo } from "@/lib/currency-conversion"
import { rateChip } from "@/components/v2/currency/format"
import { AmountCard } from "@/components/v2/expense-form/amount-card"
import { CalculatorPad } from "@/components/v2/expense-form/calculator-pad"
import { CategoryPicker } from "@/components/v2/expense-form/category-picker"
import { LocationPickerV2 } from "@/components/v2/expense-form/location-picker-v2"
import { PayerPicker } from "@/components/v2/expense-form/payer-picker"
import { SECTION_CARD, SECTION_TITLE } from "@/components/v2/expense-form/section-card"
import { SplitEditor } from "@/components/v2/expense-form/split-editor"
import { V2ImagePicker } from "@/components/v2/expense-form/v2-image-picker"

type Member = { id: string; displayName: string; image?: string | null; remainderDiscrepancy?: number }
export function QuickItemCard({ item, members, onChange, projectCurrency, previewRateInfo }: {
  item: QuickItem
  members: Member[]
  onChange: (patch: Partial<QuickItem>) => void
  /** Settlement currency; enables the ≈ conversion preview + rate row. */
  projectCurrency?: string
  /** Resolve a display-only rate + its source (currency → settlement). */
  previewRateInfo?: (currency: string) => PreviewRateInfo
}) {
  const [showCalculator, setShowCalculator] = useState(false)
  const amount = Number(item.amount) || 0
  // Mirrors the expense form's per-expense rate wiring: automatic rate by
  // default, pinned custom rate once the user toggles the pin.
  const isForeign = !!projectCurrency && item.currency !== projectCurrency
  const rateInfo = isForeign
    ? previewRateInfo?.(item.currency) ?? { rate: null, source: "none" as const }
    : { rate: null, source: "same" as const }
  const autoRate = rateInfo.rate
  const exchangeRateInput = item.exchangeRate ?? ""
  const manualRate = exchangeRateInput.trim() ? Number(exchangeRateInput) : null
  const usableManual = manualRate != null && Number.isFinite(manualRate) && manualRate > 0 ? manualRate : null
  const customRate = item.ratePinned ?? false
  const rate = customRate ? usableManual ?? autoRate : autoRate
  const previewProjectAmount = rate != null ? amount * rate : null
  const rateSource = customRate ? ("custom" as const) : rateInfo.source
  // Same provenance vocabulary as the expense form (no history in quick-entry).
  const chip = isForeign
    ? rateChip({
        kind: rateSource === "fixed" ? "project" : rateSource === "live" ? "market" : rateSource === "custom" ? "custom" : null,
        date: rateSource === "live" ? new Date() : null,
        now: new Date(),
      })
    : null

  // Drive the shared SplitEditor from the item's own split state so the AI
  // result card matches the expense form exactly.
  const memberIds = members.map((m) => m.id)
  const splitState: SplitState = {
    pool: item.participantIds,
    personalMode: item.personalMode,
    personalItems: item.personalItems,
    personalMembers: item.personalMembers,
    customShares: item.customShares,
  }
  const applySplit = (next: SplitState) =>
    onChange({
      participantIds: next.pool,
      personalMode: next.personalMode,
      personalItems: next.personalItems,
      personalMembers: next.personalMembers,
      customShares: next.customShares,
    })
  const splitActions: SplitActions = {
    setPersonalMode: (v) => applySplit(withPersonalMode(splitState, v)),
    togglePersonalMember: (id) => applySplit(withToggledPersonalMember(splitState, id)),
    setPersonalAll: (v) => applySplit(withPersonalAll(splitState, memberIds, v)),
    addItem: (id) => applySplit(withAddedItem(splitState, id)),
    updateItem: (id, itemId, field, value) => applySplit(withUpdatedItem(splitState, id, itemId, field, value)),
    removeItem: (id, itemId) => applySplit(withRemovedItem(splitState, id, itemId)),
    togglePool: (id) => applySplit(withToggledPool(splitState, id)),
    setPoolAll: (v) => applySplit(withPoolAll(splitState, memberIds, v)),
    setCustomShare: (id, value) => applySplit(withCustomShare(splitState, id, value)),
    clearCustomShare: (id) => applySplit(withClearedCustomShare(splitState, id)),
  }
  const discrepancy = Object.fromEntries(members.map((m) => [m.id, m.remainderDiscrepancy ?? 0]))
  const splitContext =
    rate != null || item.currency === (projectCurrency ?? item.currency)
      ? { currency: item.currency, projectCurrency: projectCurrency ?? item.currency, rate: rate ?? 1, discrepancy }
      : undefined
  const splitDraft: SplitDraft = { state: splitState, actions: splitActions, derived: deriveSplit(amount, memberIds, splitState, splitContext) }

  // Multi-payer state, mirroring the v2 expense form's PayerPicker wiring.
  const payerDerived = itemDerivedPayers(item)
  const togglePayer = (id: string) => {
    const payerIds = item.payerIds.includes(id) ? item.payerIds.filter((x) => x !== id) : [...item.payerIds, id]
    const pinnedPayerAmounts = { ...item.pinnedPayerAmounts }
    if (!payerIds.includes(id)) delete pinnedPayerAmounts[id]
    onChange({ payerIds, pinnedPayerAmounts })
  }
  const setPayersAll = (selectAll: boolean) =>
    onChange({
      payerIds: selectAll ? memberIds : [],
      pinnedPayerAmounts: selectAll ? item.pinnedPayerAmounts : {},
    })
  const setPayerAmount = (id: string, value: string) => {
    // Keep the key when emptied so the input stays open (an empty value = auto).
    onChange({ pinnedPayerAmounts: { ...item.pinnedPayerAmounts, [id]: value } })
  }
  const clearPayerAmount = (id: string) => {
    const pinnedPayerAmounts = { ...item.pinnedPayerAmounts }
    delete pinnedPayerAmounts[id]
    onChange({ pinnedPayerAmounts })
  }

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
        projectCurrency={projectCurrency}
        previewProjectAmount={previewProjectAmount}
        rate={rate}
        rateInput={exchangeRateInput}
        rateEditable={isForeign}
        onRate={(v) => onChange({ exchangeRate: v })}
        customRate={customRate}
        rateChip={chip}
        onToggleCustomRate={() => {
          if (customRate) onChange({ exchangeRate: "", ratePinned: false })
          else onChange({ exchangeRate: autoRate != null ? String(roundRateForDisplay(autoRate)) : "", ratePinned: true })
        }}
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

      <PayerPicker
        members={members}
        payerIds={item.payerIds}
        pinned={item.pinnedPayerAmounts}
        payers={payerDerived.payers}
        matches={payerDerived.payerMatches}
        amount={amount}
        currency={item.currency}
        projectCurrency={projectCurrency}
        rate={rate}
        onTogglePayer={togglePayer}
        onSetAll={setPayersAll}
        onSetAmount={setPayerAmount}
        onClearAmount={clearPayerAmount}
      />

      <SplitEditor members={members} currency={item.currency} projectCurrency={projectCurrency} rate={rate} draft={splitDraft} />

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

      <V2ImagePicker
        label="收據/消費圖片"
        value={item.image.preview ?? item.image.image}
        onChange={(file) => {
          if (item.image.preview) URL.revokeObjectURL(item.image.preview)
          onChange({ image: { image: null, pendingFile: file, preview: URL.createObjectURL(file) } })
        }}
        onRemove={() => {
          if (item.image.preview) URL.revokeObjectURL(item.image.preview)
          onChange({ image: { image: null, pendingFile: null, preview: null } })
        }}
      />
    </div>
  )
}
