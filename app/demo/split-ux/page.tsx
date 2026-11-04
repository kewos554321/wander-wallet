"use client"

import { useEffect, useState } from "react"
import { DEMO_CURRENCY, DEMO_MEMBERS } from "@/app/demo/_data/fixtures"
import { SplitPanel } from "@/components/v2/expense-form/split-panel"
import { useExpenseDraft } from "@/components/v2/expense-form/use-expense-draft"
import { ProposedSplitPanel } from "./proposed-split"

// Demo only: the shipped split entry (before) and the proposed summary-row
// entry (after), on the same TWD 600 expense and the same four travellers.
// The before side mounts the real SplitPanel, not a mock.

const AMOUNT_INPUT = "600"
const AMOUNT = 600

const DIFFS = [
  {
    label: "預設",
    before: "只有付款人（1 / 4），要先自己發現「全選」",
    after: "全體平分（4 / 4），但只顯示一行「全體 4 人 · 每人 TWD 150」",
  },
  {
    label: "高度",
    before: "兩排 pills＋每位旅伴的金額列，四個人就先吃掉半個畫面",
    after: "付款人一行、分攤一行；名單只在按「調整」時出現",
  },
  {
    label: "例外",
    before: "取消每個人後，畫面只剩一排未選取的 pills，看不出這筆會怎麼分",
    after: "按「只有我」會明說「這筆不會分給其他旅伴」，例外不再靜默",
  },
]

export default function SplitUxDemoPage() {
  const [view, setView] = useState<"before" | "after">("after")
  const beforeDraft = useExpenseDraft({
    members: DEMO_MEMBERS,
    currency: DEMO_CURRENCY,
    projectCurrency: DEMO_CURRENCY,
    paidBy: "me",
  })

  useEffect(() => {
    beforeDraft.actions.setAmount(AMOUNT_INPUT)
  }, [beforeDraft.actions])

  return (
    <div className="mx-auto max-w-md pb-28">
      <div className="px-4 pt-6">
        <h1 className="m-0 font-v2-serif text-[22px] font-bold leading-7 text-v2-ink">
          分攤入口 · 改前／改後
        </h1>
        <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-v2-ink-muted">
          同一筆 TWD 600、同一組 4 位旅伴。切換看預設分攤的差別：改前是「只有付款人」，
          改後是「全體平分，但只顯示一行 summary」。
        </p>
      </div>

      <div className="mt-4 px-4" role="group" aria-label="切換版本">
        <div className="grid grid-cols-2 gap-1 rounded-v2-md border border-v2-line bg-v2-surface p-1">
          {(
            [
              { value: "before", label: "改前" },
              { value: "after", label: "改後（提案）" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={view === option.value}
              onClick={() => setView(option.value)}
              className={`min-h-[44px] rounded-v2-sm text-[13px] font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none ${
                view === option.value
                  ? "bg-v2-lake text-v2-on-lake"
                  : "text-v2-ink-muted hover:bg-v2-sand"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 border-y border-v2-line bg-v2-paper py-4">
        <div className="px-4 pb-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              view === "before" ? "bg-v2-sand text-v2-ink" : "bg-v2-lake-soft text-v2-lake"
            }`}
          >
            {view === "before" ? "目前：預設只有付款人" : "提案：預設全體平分"}
          </span>
        </div>

        {/* Both stay mounted so switching back keeps whatever the user changed. */}
        <div className={view === "before" ? "" : "hidden"}>
          <SplitPanel members={DEMO_MEMBERS} draft={beforeDraft} variant="platform" />
        </div>
        <div className={view === "after" ? "" : "hidden"}>
          <ProposedSplitPanel
            members={DEMO_MEMBERS}
            amount={AMOUNT}
            currency={DEMO_CURRENCY}
            currentMemberId="me"
          />
        </div>
      </div>

      <section className="px-4 pt-5">
        <h2 className="m-0 font-v2-serif text-lg font-bold leading-6 text-v2-ink">差別在哪</h2>
        <dl className="mt-2 divide-y divide-v2-line border-y border-v2-line">
          {DIFFS.map((item) => (
            <div key={item.label} className="grid grid-cols-[56px_1fr] gap-3 py-3">
              <dt className="m-0 text-[12px] font-bold text-v2-ink-muted">{item.label}</dt>
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
        <p className="m-0 mt-4 text-[12px] leading-5 text-v2-ink-muted">
          試試看：在改後按「調整」取消小婷，4 人變 3 人，每人從 TWD 150 變 TWD 200；
          再按「只有我」，看例外怎麼被說出來。
        </p>
      </section>
    </div>
  )
}
