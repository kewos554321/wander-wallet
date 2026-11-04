"use client"

// /demo/project-form-fixes — before/after for the re-run critique's three P1s.
//   1 說明字對比：text-v2-ink-subtle (~2.2:1) → text-v2-ink-muted (~5.5:1)
//   2 focus 可見：outline-none（看不到）→ focus-visible ring
//   3 加入方式：只留標籤 → (a) 每項補一行說明 ／ (b) 一句共用說明

import { JoinModePicker } from "@/components/v2/project/join-mode-picker"
import { useProjectForm } from "@/lib/hooks/use-project-form"
import { DEMO_FORM_VALUES } from "@/app/demo/_data/fixtures"

const cardClass = "flex flex-col gap-3.5 rounded-[18px] border border-v2-line bg-v2-surface p-4"
const titleClass = "m-0 text-[13px] font-bold text-v2-lake"
const labelClass = "mb-2 block text-xs font-semibold text-v2-ink-muted"
const nameBase = "w-full rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-[13px] text-[15px] font-bold tracking-[.3px] outline-none"
const nameAfter = `${nameBase} transition focus-visible:border-v2-lake focus-visible:ring-2 focus-visible:ring-v2-lake/30`
// A forced-focus copy so the ring is visible without interaction.
const nameFocused = `${nameBase} border-v2-lake ring-2 ring-v2-lake/30`

function Pair({ before, after, note }: { before: React.ReactNode; after: React.ReactNode; note: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-bold text-v2-danger-strong">修改前</p>
        {before}
      </div>
      <div>
        <p className="mb-2 text-xs font-bold text-v2-lake">修改後</p>
        {after}
      </div>
      <p className="m-0 text-[11px] text-v2-ink-muted md:col-span-2">{note}</p>
    </div>
  )
}

export default function ProjectFormFixesDemoPage() {
  const { values, set } = useProjectForm(DEMO_FORM_VALUES)

  const settlementHelp = (tone: string) => (
    <div className={cardClass}>
      <p className={titleClass}>結算幣別</p>
      <p className={`m-0 -mt-1 text-xs ${tone}`}>所有費用將以此幣別進行結算計算</p>
      <p className={`m-0 -mt-1 text-xs ${tone}`}>最小單位：1 TWD（無小數）</p>
      <div className="flex items-center justify-between rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-3 text-[13px] text-v2-ink">
        <span className="font-semibold">TWD 新台幣</span>
        <span className="text-v2-ink-subtle">▾</span>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="m-0 text-lg font-bold text-v2-ink">旅程表單 · P1 前後對照</h1>
      <p className="mt-1 text-sm text-v2-ink-muted">三個 P1：說明字對比、focus 可見、加入方式說明。</p>

      {/* 1 — contrast */}
      <section className="mt-8">
        <h2 className="m-0 text-base font-bold text-v2-ink">① 說明字對比</h2>
        <p className="mb-4 mt-1 text-sm text-v2-ink-muted">
          結算幣別的兩行說明。舊的 <code>text-v2-ink-subtle</code>（#B7AE9D）在白底只有約 2.2:1，未達 WCAG AA 4.5:1。
        </p>
        <Pair
          before={settlementHelp("text-v2-ink-subtle")}
          after={settlementHelp("text-v2-ink-muted")}
          note="修改後改用 text-v2-ink-muted（#6E6860，約 5.5:1），字級不變、仍舊低調。"
        />
      </section>

      {/* 2 — focus */}
      <section className="mt-10">
        <h2 className="m-0 text-base font-bold text-v2-ink">② 文字欄位的 focus</h2>
        <p className="mb-4 mt-1 text-sm text-v2-ink-muted">
          舊版所有 input 都是 <code>outline-none</code>，鍵盤／Tab 時完全看不出游標在哪。修改後加上 focus ring。
        </p>
        <Pair
          before={
            <div className={cardClass}>
              <p className={titleClass}>基本資訊</p>
              <label className={labelClass}>旅程名稱</label>
              <input readOnly value="東京之旅" className={nameBase} />
            </div>
          }
          after={
            <div className={cardClass}>
              <p className={titleClass}>基本資訊</p>
              <label className={labelClass}>旅程名稱</label>
              <input readOnly value="東京之旅" className={nameAfter} />
              <input readOnly value="（這是 focus 中的樣子）" className={nameFocused} aria-hidden="true" />
            </div>
          }
          note="修改後：focus 時邊框轉 v2-lake 並帶一圈淡光。左邊那格點下去也不會出現任何狀態；右邊點下去會亮。"
        />
      </section>

      {/* 3 — join mode */}
      <section className="mt-10">
        <h2 className="m-0 text-base font-bold text-v2-ink">③ 加入方式（精簡度選擇）</h2>
        <p className="mb-4 mt-1 text-sm text-v2-ink-muted">
          現在只剩標籤，<code>佔位成員</code> 全流程沒有解釋。下方三種排法給你挑。
        </p>

        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-bold text-v2-danger-strong">現況（只留標籤）</p>
            <div className={cardClass}>
              <p className={titleClass}>成員加入方式</p>
              <JoinModePicker variant="settings" value={values.joinMode} onChange={(v) => set("joinMode", v)} />
            </div>
            <p className="mt-2 text-[11px] text-v2-ink-muted">最短，但第一次用的人看不懂「佔位成員」。</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-v2-lake">A · 每項補一行說明</p>
            <div className={cardClass}>
              <p className={titleClass}>成員加入方式</p>
              <JoinModePicker variant="create" value={values.joinMode} onChange={(v) => set("joinMode", v)} />
            </div>
            <p className="mt-2 text-[11px] text-v2-ink-muted">多 3 行，最好懂；跟建立頁原本的寫法一致。</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-v2-lake">B · 一句共用說明</p>
            <div className={cardClass}>
              <p className={titleClass}>成員加入方式</p>
              <p className="m-0 -mt-1 text-xs text-v2-ink-muted">
                透過分享連結加入的人，只能建立自己的身份，或取代你建立的佔位成員。
              </p>
              <JoinModePicker variant="settings" value={values.joinMode} onChange={(v) => set("joinMode", v)} />
            </div>
            <p className="mt-2 text-[11px] text-v2-ink-muted">只多 1 行，先解釋「佔位成員」是什麼，選項仍精簡。</p>
          </div>
        </div>
      </section>
    </div>
  )
}
