"use client"

// /demo/project-form — proposed unified layout for 建立旅程 (create) and
// 旅程設定 (edit). Critique P0+P1, plus a compact/verbose toggle so the
// "too many lines" question can be judged directly.
//   P0  one shared field-group skeleton + order
//   P0  cover: one interaction (tile → sheet) on both
//   P1  naming 旅程 everywhere (+*), big name input, one budget-symbol rule
//       (ISO code, per D17); join mode keeps its descriptions in verbose
// Compact cuts: cover sits inline with the name (no label/hint), no description
// counter, no budget help line, no currency help lines, join labels only.

import { useState } from "react"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { CoverTileButton } from "@/components/v2/cover/cover-tile-button"
import { DateRangeField } from "@/components/v2/project/date-range-field"
import { JoinModePicker } from "@/components/v2/project/join-mode-picker"
import { V2CurrencyField, currencySymbol } from "@/components/v2/ui/currency-field"
import { TripPreviewCard } from "@/components/v2/new-project/trip-preview-card"
import { minorUnitLabel } from "@/lib/constants/currencies"
import { useProjectForm } from "@/lib/hooks/use-project-form"
import { DEMO_FORM_VALUES } from "@/app/demo/_data/fixtures"

const cardClass = "flex flex-col gap-3.5 rounded-[18px] border border-v2-line bg-v2-surface p-4"
const titleClass = "m-0 text-[13px] font-bold text-v2-lake"
const labelClass = "mb-2 block text-xs font-semibold text-v2-ink-muted"

function UnifiedForm({ variant, verbose }: { variant: "create" | "edit"; verbose: boolean }) {
  const { values, set } = useProjectForm(DEMO_FORM_VALUES)
  const count = values.description.length
  const id = (s: string) => `${variant}-${verbose ? "v" : "c"}-${s}`

  const nameField = (
    <div className="min-w-0 flex-1">
      <label htmlFor={id("name")} className={labelClass}>
        旅程名稱 <span className="text-v2-danger">*</span>
      </label>
      <input
        id={id("name")}
        aria-label="旅程名稱"
        value={values.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder="例如：日本關西 5 天"
        className="w-full rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-[13px] text-[15px] font-bold tracking-[.3px] outline-none"
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-4 pt-4">
      {variant === "create" && (
        <div className={cardClass}>
          <p className={titleClass}>卡片預覽</p>
          <TripPreviewCard cover={values.cover} name={values.name} startDate={values.startDate} endDate={values.endDate} />
        </div>
      )}

      <div className={cardClass}>
        <p className={titleClass}>基本資訊</p>
        {verbose ? (
          <>
            {nameField}
            <div>
              <p className={labelClass}>封面</p>
              <div className="flex items-center gap-3">
                <CoverTileButton cover={values.cover} onChange={(c) => set("cover", c)} />
                <span className="text-xs text-v2-ink-muted">點擊更換封面</span>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
            <p className={labelClass}>封面</p>
            <label htmlFor={id("name")} className={labelClass}>
              旅程名稱 <span className="text-v2-danger">*</span>
            </label>
            <CoverTileButton cover={values.cover} onChange={(c) => set("cover", c)} />
            <input
              id={id("name")}
              aria-label="旅程名稱"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="例如：日本關西 5 天"
              className="w-full rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-[13px] text-[15px] font-bold tracking-[.3px] outline-none"
            />
          </div>
        )}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor={id("desc")} className="block text-xs font-semibold text-v2-ink-muted">
              描述（選填）
            </label>
            {verbose && <span className={`text-xs ${count > 60 ? "text-v2-danger" : "text-v2-ink-subtle"}`}>{count}/60</span>}
          </div>
          <textarea
            id={id("desc")}
            aria-label="描述"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="記錄這次旅行的目的地、日期等資訊……"
            className="min-h-16 w-full rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-[13px] text-[13px] outline-none"
          />
        </div>
      </div>

      <div className={cardClass}>
        <p className={titleClass}>日期與預算</p>
        <DateRangeField
          label="出發日與結束日"
          startDate={values.startDate}
          endDate={values.endDate}
          onChange={(start, end) => {
            set("startDate", start)
            set("endDate", end)
          }}
        />
        <div>
          <label htmlFor={id("budget")} className={labelClass}>
            旅程預算（選填）
          </label>
          {verbose && <p className="mb-2 mt-1 text-xs text-v2-ink-subtle">設定後可在旅程總覽查看花費進度</p>}
          <div className="flex items-center gap-1.5 rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-3">
            <span className="text-[13px] text-v2-ink-muted">{currencySymbol(values.currency)}</span>
            <input
              id={id("budget")}
              aria-label="旅程預算"
              inputMode="decimal"
              value={values.budget}
              onChange={(e) => set("budget", e.target.value)}
              className="w-full bg-transparent text-[13px] outline-none"
            />
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <p className={titleClass}>結算幣別</p>
        <p className="m-0 -mt-1 text-xs text-v2-ink-subtle">所有費用將以此幣別進行結算計算</p>
        <p className="m-0 -mt-1 text-xs text-v2-ink-subtle">最小單位：{minorUnitLabel(values.currency)}</p>
        <V2CurrencyField value={values.currency} onChange={(c) => set("currency", c)} ariaLabel="結算幣別" />
      </div>

      {verbose ? (
        <div className={cardClass}>
          <JoinModePicker value={values.joinMode} onChange={(v) => set("joinMode", v)} />
        </div>
      ) : (
        <div className={cardClass}>
          <p className={titleClass}>成員加入方式</p>
          <JoinModePicker variant="settings" value={values.joinMode} onChange={(v) => set("joinMode", v)} />
        </div>
      )}

      {variant === "edit" && (
        <div className="rounded-[18px] border border-v2-danger-border bg-v2-danger-tint p-4">
          <p className="m-0 mb-1 text-[13px] font-bold text-v2-danger-strong">危險區域</p>
          <p className="m-0 mb-3 text-xs text-v2-danger-strong">刪除旅程後，所有成員與支出紀錄都會永久移除，此操作無法復原。</p>
          <button
            type="button"
            className="inline-flex items-center rounded-full bg-v2-danger-strong px-4 py-[9px] text-xs font-bold text-v2-on-lake"
          >
            刪除旅程
          </button>
        </div>
      )}
    </div>
  )
}

function FooterBar({ variant }: { variant: "create" | "edit" }) {
  return (
    <div className="border-t border-v2-line bg-v2-surface px-4 py-3.5">
      <div className="flex gap-2.5">
        {variant === "edit" && (
          <button type="button" className="flex-1 rounded-[14px] border border-v2-line bg-v2-surface py-3.5 text-sm font-bold">
            取消
          </button>
        )}
        <button type="button" className="flex-1 rounded-[14px] bg-v2-lake py-3.5 text-sm font-bold text-v2-on-lake">
          {variant === "create" ? "建立旅程" : "儲存變更"}
        </button>
      </div>
    </div>
  )
}

function Frame({ title, hint, variant, verbose }: { title: string; hint: string; variant: "create" | "edit"; verbose: boolean }) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-v2-line bg-v2-paper">
      <div className="border-b border-v2-line bg-v2-sand px-4 py-2.5">
        <p className="m-0 text-[13px] font-bold text-v2-ink">{title}</p>
        <p className="m-0 mt-0.5 text-[11px] text-v2-ink-muted">{hint}</p>
      </div>
      <div className="mx-auto max-w-md bg-v2-paper">
        <V2TopBar title={variant === "create" ? "建立旅程" : "旅程設定"} backHref="/demo" />
        <UnifiedForm variant={variant} verbose={verbose} />
        <FooterBar variant={variant} />
      </div>
    </div>
  )
}

export default function ProjectFormDemoPage() {
  const [verbose, setVerbose] = useState(false)
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-lg font-bold text-v2-ink">旅程表單 · 統一版 demo</h1>
          <p className="mt-1 text-sm text-v2-ink-muted">
            同一套骨架用在「建立旅程」與「旅程設定」；文案一律「旅程」（route／程式碼維持 project）。
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-v2-sand p-1">
          {[
            { v: false, label: "精簡版" },
            { v: true, label: "含說明" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setVerbose(o.v)}
              className={`rounded-[9px] px-4 py-1.5 text-[13px] font-bold transition ${
                verbose === o.v ? "bg-v2-surface text-v2-lake shadow-[0_1px_3px_rgba(27,24,21,.1)]" : "text-v2-ink-muted"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <Frame title="建立旅程" hint="含「卡片預覽」，底部一顆主要按鈕" variant="create" verbose={verbose} />
        <Frame title="旅程設定（原：專案設定）" hint="含「危險區域」，底部「取消／儲存變更」" variant="edit" verbose={verbose} />
      </div>
    </div>
  )
}
