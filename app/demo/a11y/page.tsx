"use client"

import { useState, type ReactNode } from "react"
import { CalendarDays, ChevronLeft, Lock, LockOpen, Share2 } from "lucide-react"

// Demo only: contrast, touch targets and zoom on the same small sample.
// The before side deliberately uses the shipped values so the difference is
// measured against production, not against a mock.

type View = "before" | "after"

const DIFFS = [
  {
    label: "對比",
    before: "小字用 ink-subtle，對白底 2.20:1、紙底 2.06:1，低於 WCAG AA。",
    after: "小字改用 ink-muted（5.16:1）；ink-subtle 只留裝飾與非必要資訊。",
  },
  {
    label: "觸控",
    before: "返回 34px、分享 pill 32px、頭像 36px、日曆格 40px，都低於 44px。",
    after: "主要控制至少 44×44；日曆格 44px；slider thumb 放大到 24px。",
  },
  {
    label: "縮放",
    before: "maximumScale: 1 + userScalable: false，小字無法用雙指補救。",
    after: "移除限制，允許縮放到 200%；小字本身也先修好。",
  },
]

function ViewToggle({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <div role="group" aria-label="切換版本">
      <div className="grid grid-cols-2 gap-1 rounded-v2-md border border-v2-line bg-v2-surface p-1">
        {(
          [
            { value: "before", label: "改前" },
            { value: "after", label: "改後（已套用）" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={view === option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-[44px] rounded-v2-sm text-[13px] font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none ${
              view === option.value ? "bg-v2-lake text-v2-on-lake" : "text-v2-ink-muted hover:bg-v2-sand"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function TouchSample({
  label,
  size,
  view,
  children,
}: {
  label: string
  size: number
  view: View
  children: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={`flex items-center justify-center rounded-full border border-dashed ${
          view === "before" ? "border-v2-danger-border text-v2-ink-muted" : "border-v2-lake-edge text-v2-lake"
        }`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {children}
      </span>
      <span className="text-[10px] leading-3 text-v2-ink-muted">{label}</span>
      <span className={`text-[10px] font-bold leading-3 ${view === "before" ? "text-v2-danger" : "text-v2-lake"}`}>
        {size}px
      </span>
    </div>
  )
}

export default function A11yDemoPage() {
  const [view, setView] = useState<View>("after")
  const before = view === "before"

  return (
    <div className="mx-auto max-w-md pb-28">
      <div className="px-4 pt-6">
        <h1 className="m-0 font-v2-serif text-[22px] font-bold leading-7 text-v2-ink">對比與觸控 · 改前／改後</h1>
        <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-v2-ink-muted">
          同一組小字、四個控制項與縮放設定。切換看現在的數值，以及提案後的數值。
        </p>
      </div>

      <div className="mt-4 px-4">
        <ViewToggle view={view} onChange={setView} />
      </div>

      <div className="mt-4 border-y border-v2-line bg-v2-paper py-4">
        <div className="px-4 pb-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              before ? "bg-v2-sand text-v2-ink" : "bg-v2-lake-soft text-v2-lake"
            }`}
          >
            {before ? "目前：數值低於門檻" : "已套用：達到 WCAG AA 與 44px"}
          </span>
        </div>

        <div className="mx-4 rounded-v2-lg border border-v2-line bg-v2-surface p-4">
          <p className="m-0 text-[13px] font-bold leading-4 text-v2-lake">旅程總覽</p>
          <p
            className={`m-0 mt-1 text-[11px] leading-4 tracking-[.3px] ${
              before ? "text-v2-ink-subtle" : "text-v2-ink-muted"
            }`}
          >
            10/08 – 10/12 · 4 位旅伴
          </p>
          <p
            className={`m-0 mt-2 text-[11px] leading-4 ${
              before ? "text-v2-ink-subtle" : "text-v2-ink-muted"
            }`}
          >
            阿明、阿凱、小婷共欠你這趟旅程先付的錢。
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-v2-sand px-2 py-0.5 text-[10px] font-bold text-v2-ink-muted">
              小字對比
            </span>
            <span className={`text-[12px] font-bold tabular-nums ${before ? "text-v2-danger" : "text-v2-lake"}`}>
              {before ? "2.20:1" : "5.16:1"}
            </span>
            <span className="text-[10px] text-v2-ink-muted">WCAG AA 需 4.5:1</span>
          </div>
        </div>

        <div className="mx-4 mt-4 rounded-v2-lg border border-v2-line bg-v2-surface p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="m-0 text-[12px] font-bold leading-4 text-v2-ink">觸控目標</p>
            <span className={`text-[10px] font-bold ${before ? "text-v2-danger" : "text-v2-lake"}`}>
              {before ? "32–40px" : "全部 ≥44px"}
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-2">
            <TouchSample label="返回" size={before ? 34 : 44} view={view}>
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </TouchSample>
            <TouchSample label="分享" size={before ? 32 : 44} view={view}>
              <Share2 className="h-4 w-4" strokeWidth={1.8} />
            </TouchSample>
            <TouchSample label="頭像" size={before ? 36 : 44} view={view}>
              <span className="text-[11px] font-bold">我</span>
            </TouchSample>
            <TouchSample label="日曆" size={before ? 40 : 44} view={view}>
              <CalendarDays className="h-4 w-4" strokeWidth={1.8} />
            </TouchSample>
          </div>
          <p className="m-0 mt-2 text-[10px] leading-4 text-v2-ink-muted">
            虛線圓是實際可點範圍；提案版另將 slider thumb 從 14px 放大到 24px。
          </p>
        </div>

        <div className="mx-4 mt-4 rounded-v2-lg border border-v2-line bg-v2-surface p-4">
          <div className="flex items-center gap-2">
            {before ? (
              <Lock className="h-4 w-4 text-v2-danger" strokeWidth={2} aria-hidden="true" />
            ) : (
              <LockOpen className="h-4 w-4 text-v2-lake" strokeWidth={2} aria-hidden="true" />
            )}
            <p className={`m-0 text-[12px] font-bold ${before ? "text-v2-danger" : "text-v2-lake"}`}>
              {before ? "maximumScale: 1 · 無法放大" : "允許縮放至 200%"}
            </p>
          </div>
          <p className="m-0 mt-1 text-[10px] leading-4 text-v2-ink-muted">
            {before ? "小字在戶外或長輩手上無法用雙指補救。" : "移除 maximumScale / userScalable:false，小字也先修好。"}
          </p>
          <p
            className="m-0 mt-2 font-v2-serif font-bold leading-tight text-v2-ink"
            style={{ fontSize: before ? 13 : 26 }}
          >
            東京賞楓 5 日
          </p>
          <p className="m-0 mt-0.5 text-[10px] text-v2-ink-muted">
            {before ? "模擬目前可讀大小" : "模擬 200% 放大後"}
          </p>
        </div>
      </div>

      <section className="mt-7 px-4">
        <h2 className="m-0 font-v2-serif text-lg font-bold leading-6 text-v2-ink">差別在哪</h2>
        <dl className="m-0 mt-2 divide-y divide-v2-line border-y border-v2-line">
          {DIFFS.map((item) => (
            <div key={item.label} className="grid grid-cols-[56px_1fr] gap-3 py-3">
              <dt className="m-0 text-[12px] font-bold leading-5 text-v2-ink-muted">{item.label}</dt>
              <dd className="m-0 space-y-1.5">
                <div className="flex gap-2">
                  <span className="w-9 shrink-0 text-[11px] font-bold text-v2-ink-muted">改前</span>
                  <span className="text-[12px] leading-5 text-v2-ink-muted">{item.before}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-9 shrink-0 text-[11px] font-bold text-v2-lake">改後</span>
                  <span className="text-[12px] font-semibold leading-5 text-v2-ink">{item.after}</span>
                </div>
              </dd>
            </div>
          ))}
        </dl>
        <p className="m-0 mt-4 text-[11px] leading-5 text-v2-ink-muted">
          正式修法已套用在 `components/v2` 的 `ink-subtle` 文字、`v2-top-bar`／pill／avatar／calendar 尺寸、
          `app/globals.css` 的 slider thumb，以及 `app/layout.tsx` 的 viewport 設定。
        </p>
      </section>
    </div>
  )
}
