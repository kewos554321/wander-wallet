"use client"

import { useState } from "react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { CalendarIcon, Trash2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Calculator } from "@/components/ui/calculator"
import { ImagePicker } from "@/components/ui/image-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LocationPicker } from "@/components/location-picker"
import { formatCurrency } from "@/lib/constants/currencies"
import { SECTION_CARD, SECTION_TITLE } from "./section-card"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { AmountCard } from "./amount-card"
import { CategoryPicker } from "./category-picker"
import { PayerPicker } from "./payer-picker"
import { SplitEditor } from "./split-editor"
import type { DraftMember, useExpenseDraft } from "./use-expense-draft"

export interface ExpenseFormV2ViewProps {
  mode: "create" | "edit"
  projectId: string
  members: DraftMember[]
  draft: ReturnType<typeof useExpenseDraft>
  canNotifyLine: boolean
  submitting: boolean
  submitError: string | null
  onSubmit: () => void
  onRequestDelete?: () => void
}

export function ExpenseFormV2View(props: ExpenseFormV2ViewProps) {
  const { draft } = props
  const { state, actions, derived } = draft
  const [showCalculator, setShowCalculator] = useState(false)
  const error = derived.error ?? props.submitError
  const amountLabel = formatCurrency(derived.splitInput.amount, state.currency)
  const submitLabel = props.mode === "create" ? `新增支出 · ${amountLabel}` : "儲存變更"

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!derived.error) props.onSubmit()
      }}
    >
      <V2TopBar title={props.mode === "create" ? "新增支出" : "編輯支出"} backHref={`/projects/${props.projectId}`} />
      <AmountCard
        amount={state.amount}
        currency={state.currency}
        onAmount={actions.setAmount}
        onCurrency={actions.setCurrency}
        onOpenCalculator={() => setShowCalculator(true)}
      />
      {showCalculator && (
        <Calculator
          // Props follow the v1 form's usage of Calculator (components/expense/expense-form.tsx):
          // onApply receives the evaluated number, not a string.
          initialValue={state.amount}
          onApply={(value: number) => {
            actions.setAmount(String(value))
            setShowCalculator(false)
          }}
          onClose={() => setShowCalculator(false)}
        />
      )}
      <div className={`${SECTION_CARD} mt-3.5`}>
        <label htmlFor="v2-desc" className={`block ${SECTION_TITLE} mb-1.5`}>
          描述
        </label>
        <input
          id="v2-desc"
          value={state.description}
          onChange={(e) => actions.setDescription(e.target.value)}
          className="w-full rounded-xl border border-v2-line bg-v2-paper px-3.5 py-3 text-[13px] outline-none"
        />
      </div>
      <CategoryPicker value={state.category} onChange={actions.setCategory} />
      <PayerPicker members={props.members} value={state.paidBy} onChange={actions.setPaidBy} />
      <SplitEditor members={props.members} draft={draft} currency={state.currency} />

      <div className={SECTION_CARD}>
        <p className={`mb-2 ${SECTION_TITLE}`}>支出日期</p>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="flex w-full items-center gap-2 rounded-xl border border-v2-line bg-v2-paper px-3.5 py-3 text-left text-[13px]">
              <CalendarIcon className="h-[15px] w-[15px] text-v2-ink-muted" aria-hidden="true" />
              <span>{format(state.expenseDate, "yyyy/MM/dd（EEEEE）", { locale: zhTW })}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={state.expenseDate} onSelect={(d) => d && actions.setExpenseDate(d)} />
          </PopoverContent>
        </Popover>
      </div>

      <div className={SECTION_CARD}>
        <p className={`mb-2 ${SECTION_TITLE}`}>消費地點</p>
        <LocationPicker value={state.location} onChange={actions.setLocation} />
      </div>

      <div className={SECTION_CARD}>
        <p className={`mb-2 ${SECTION_TITLE}`}>收據/消費圖片</p>
        <ImagePicker value={state.image} onChange={actions.setImage} disabled={props.submitting} />
      </div>

      {props.canNotifyLine && (
        <label className="mx-4 mb-4 flex items-center gap-2.5 rounded-[14px] border border-v2-line bg-v2-surface px-3.5 py-3">
          <input
            type="checkbox"
            checked={state.notifyLine}
            onChange={(e) => actions.setNotifyLine(e.target.checked)}
            className="h-5 w-5 accent-v2-lake"
          />
          <span>
            <span className="block text-xs font-bold">通知 LINE 群組</span>
            <span className="mt-px block text-xs text-v2-ink-muted">儲存後自動發送通知到群組</span>
          </span>
        </label>
      )}

      {props.mode === "edit" && props.onRequestDelete && (
        <div className="mx-4 mb-28">
          <button
            type="button"
            onClick={props.onRequestDelete}
            className="flex w-full items-center justify-center gap-1.5 rounded-[14px] border border-v2-line bg-v2-surface py-3 text-[13px] font-bold text-v2-danger"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            刪除支出
          </button>
        </div>
      )}
      <div className="h-28" />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-v2-line bg-v2-surface px-4 py-3.5">
        <div className="mx-auto max-w-md">
          {error && (
            <p role="alert" className="mb-2 text-center text-xs font-semibold text-v2-danger">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!!derived.error || props.submitting}
            className="w-full rounded-[14px] bg-v2-lake py-[15px] text-[15px] font-bold text-v2-on-lake disabled:opacity-40"
          >
            {props.submitting ? "儲存中..." : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}
