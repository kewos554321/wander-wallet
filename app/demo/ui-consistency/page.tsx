"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Info,
  Link2,
  Plus,
  Share2,
  Sparkles,
  X,
} from "lucide-react"
import { Sheet } from "@/components/v2/ui/sheet"

const IMPACT = [
  { value: "17", label: "條路由同時掛載 v1 + v2", note: "app/projects/**、app/settings/**" },
  { value: "7,733", label: "行 v1 程式可退休", note: "17 個檔案" },
  { value: "73", label: "次共用 components/ui 依賴", note: "其中 58 次來自 v1" },
  { value: "11", label: "個測試檔受影響", note: "uiVersion / v1 markup" },
]

function Panel({
  tone,
  label,
  caption,
  children,
}: {
  tone: "before" | "after"
  label: string
  caption: string
  children: ReactNode
}) {
  const isAfter = tone === "after"
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-wide">
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${isAfter ? "bg-v2-lake-mid" : "bg-v2-danger"}`}
          />
          <span className={isAfter ? "text-v2-lake" : "text-v2-ink-muted"}>{label}</span>
        </span>
        <span className="text-[11px] tabular-nums text-v2-ink-subtle">{caption}</span>
      </div>
      <div className="rounded-[16px] border border-v2-line bg-v2-paper p-3">{children}</div>
    </div>
  )
}

function Section({
  title,
  problem,
  children,
}: {
  title: string
  problem: string
  children: ReactNode
}) {
  return (
    <section className="mt-10 border-t border-v2-line pt-6">
      <h2 className="m-0 font-v2-serif text-[18px] font-bold text-v2-ink">{title}</h2>
      <p className="m-0 mt-1 max-w-[62ch] text-[12.5px] leading-relaxed text-v2-ink-muted">{problem}</p>
      <div className="mt-4 grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  )
}

/* ── 餘額卡 ───────────────────────────────────────────── */

function BalanceBefore() {
  return (
    <div className="rounded-v2-lg border border-v2-line bg-v2-surface px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <p className="m-0 text-[13px] font-bold leading-4 text-v2-lake">我的餘額</p>
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-v2-check text-v2-ink-subtle">
            <Info className="h-2.5 w-2.5" strokeWidth={2} />
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium leading-4 tracking-[.5px] text-v2-link">
          查看結算明細
          <ArrowRight className="h-[11px] w-[11px]" strokeWidth={2.2} />
        </span>
      </div>
      <p className="mt-0.5 font-v2-serif text-2xl font-bold leading-8 tabular-nums text-v2-ink">+NT$2,400</p>
      <p className="mt-1 text-[11px] text-v2-ink-subtle">說明文字對比 2.2:1；「結算」只是一行 12px 連結</p>
    </div>
  )
}

function BalanceAfter({ balance }: { balance: number }) {
  const settled = balance === 0
  return (
    <div className="rounded-v2-lg border border-v2-line bg-v2-surface px-4 py-3.5">
      <p className="m-0 text-[12px] font-bold leading-4 text-v2-lake">我的餘額</p>
      <p className="mt-1 font-v2-serif text-[28px] font-bold leading-9 tabular-nums text-v2-ink">
        {settled ? "NT$0" : `+NT$${balance.toLocaleString("en-US")}`}
      </p>
      <p className="mt-1 text-[12.5px] leading-5 text-v2-ink-muted">
        {settled ? "這趟已結清，沒有人需要付錢。" : "小明、小美共欠你 NT$2,400。"}
      </p>
      {settled ? (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-v2-lake-soft px-3 py-1.5 text-[12px] font-bold text-v2-lake">
          <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
          已結清
        </span>
      ) : (
        <Link
          href="/demo/settle"
          className="mt-3 flex h-11 items-center justify-center gap-1.5 rounded-v2-sm bg-v2-lake px-4 text-[13px] font-bold text-v2-on-lake transition-transform duration-150 ease-out active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
        >
          前往結算
          <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
        </Link>
      )}
    </div>
  )
}

/* ── 預算 ─────────────────────────────────────────────── */

function BudgetBefore() {
  return (
    <div className="rounded-v2-lg bg-v2-lake px-4 py-3.5 text-v2-paper">
      <div className="flex items-baseline justify-between text-[12px]">
        <span className="opacity-80">預算使用</span>
        <span className="font-bold tabular-nums">100%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(250,247,242,.22)]">
        <div className="h-full w-full rounded-full bg-v2-paper" />
      </div>
      <p className="mt-1.5 text-[11px] opacity-75">實際 118%，花費 NT$29,400／預算 NT$25,000</p>
    </div>
  )
}

function BudgetAfter() {
  return (
    <div className="rounded-v2-lg bg-v2-lake px-4 py-3.5 text-v2-paper">
      <div className="flex items-baseline justify-between text-[12px]">
        <span className="opacity-80">預算使用</span>
        <span className="font-bold tabular-nums text-[13px]">
          118% <span className="font-medium opacity-80">· 超出 NT$4,400</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(250,247,242,.22)]">
        <div className="relative h-full w-full">
          <div className="h-full w-[84.7%] rounded-l-full bg-v2-paper" />
          <div className="absolute inset-y-0 right-0 w-[15.3%] rounded-r-full bg-v2-coral" />
        </div>
      </div>
      <p className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-v2-coral-tint">
        <AlertTriangle className="h-3 w-3" strokeWidth={2.2} />
        已超出預算，白色為預算內、橘色為超出
      </p>
    </div>
  )
}

/* ── 分享 ─────────────────────────────────────────────── */

function ShareDemo() {
  const [beforeOpen, setBeforeOpen] = useState(false)
  const [afterOpen, setAfterOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  return (
    <>
      <Panel tone="before" label="現況" caption="v1 置中 modal · slate/blue">
        <button
          type="button"
          onClick={() => setBeforeOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-v2-line bg-v2-surface px-3 text-[12px] font-bold text-v2-ink"
        >
          <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
          分享邀請
        </button>
        <p className="mt-2 text-[11px] leading-relaxed text-v2-ink-subtle">
          Radix Portal 掛到 body，v2 token 失效，所以硬寫 slate / blue / LINE 綠。
        </p>
      </Panel>

      <Panel tone="after" label="調整後" caption="v2 bottom sheet · token 內聚">
        <button
          type="button"
          onClick={() => setAfterOpen(true)}
          className="inline-flex h-11 items-center gap-1.5 rounded-full border border-v2-line bg-v2-surface px-4 text-[13px] font-bold text-v2-ink shadow-v2-sm transition-transform duration-150 ease-out active:scale-[.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
        >
          <Share2 className="h-4 w-4" strokeWidth={2} />
          分享邀請
        </button>
        <p className="mt-2 text-[11px] leading-relaxed text-v2-ink-muted">
          底部升起、focus trap、Esc 關閉、複製失敗有 fallback，全部用 v2 token。
        </p>
      </Panel>

      {beforeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5"
          onClick={() => setBeforeOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="邀請旅伴（現況）"
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">邀請旅伴</h3>
              <button type="button" onClick={() => setBeforeOpen(false)} aria-label="關閉" className="text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["LINE", "複製連結", "更多"].map((label, i) => (
                <button
                  key={label}
                  type="button"
                  className={`rounded-lg px-2 py-2 text-xs font-medium text-white ${
                    i === 0 ? "bg-[#06C755]" : i === 1 ? "bg-blue-500" : "bg-slate-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-slate-500">這個畫面不屬於 v2 的視覺世界。</p>
          </div>
        </div>
      )}

      <Sheet open={afterOpen} onClose={() => setAfterOpen(false)} label="邀請旅伴">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="m-0 font-v2-serif text-[19px] font-bold text-v2-ink">邀請旅伴</h3>
            <p className="m-0 mt-1 text-[12.5px] leading-5 text-v2-ink-muted">把連結傳到 LINE 群組，朋友點開就能加入這趟旅程。</p>
          </div>
          <button
            type="button"
            onClick={() => setAfterOpen(false)}
            aria-label="關閉"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-v2-line text-v2-ink-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-v2-sm bg-v2-lake text-[14px] font-bold text-v2-on-lake transition-transform duration-150 ease-out active:scale-[.98] motion-reduce:transition-none"
        >
          <Link2 className="h-4 w-4" strokeWidth={2.2} />
          用 LINE 傳送邀請
        </button>
        <button
          type="button"
          onClick={() => {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1800)
          }}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-v2-sm border border-v2-line text-[13px] font-bold text-v2-ink"
        >
          {copied ? <Check className="h-4 w-4 text-v2-lake-mid" /> : <Link2 className="h-4 w-4" />}
          {copied ? "已複製連結" : "複製連結"}
        </button>
        <p className="m-0 mt-3 text-center text-[11px] text-v2-ink-subtle">連結 7 天內有效</p>
      </Sheet>
    </>
  )
}

/* ── 尺寸與字級 ───────────────────────────────────────── */

function SizeBefore() {
  return (
    <div className="rounded-v2-lg border border-v2-line bg-v2-surface p-4">
      <div className="flex items-center gap-1.5">
        <button type="button" className="rounded-full border border-v2-line px-2.5 py-1.5 text-[12px] font-medium text-v2-ink">
          分享
        </button>
        <button type="button" className="rounded-full border border-v2-line px-2.5 py-1.5 text-[12px] font-medium text-v2-ink">
          修改
        </button>
        <span className="ml-auto text-[10px] tabular-nums text-v2-ink-subtle">32px · gap 6px</span>
      </div>
      <p className="mt-3 text-[11px] leading-4 text-v2-ink-subtle">功能標籤 11px／匯率 12px 混用；頭像縮寫 6–7px</p>
    </div>
  )
}

function SizeAfter() {
  return (
    <div className="rounded-v2-lg border border-v2-line bg-v2-surface p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="h-11 rounded-full border border-v2-line px-4 text-[13px] font-bold text-v2-ink transition-colors duration-150 hover:bg-v2-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
        >
          分享
        </button>
        <button
          type="button"
          className="h-11 rounded-full border border-v2-line px-4 text-[13px] font-bold text-v2-ink transition-colors duration-150 hover:bg-v2-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
        >
          修改
        </button>
        <span className="ml-auto text-[10px] tabular-nums text-v2-ink-subtle">44px · gap 8px</span>
      </div>
      <p className="mt-3 text-[12px] leading-4 text-v2-ink-muted">標籤統一 12px；最小可讀 12px；所有觸控目標 ≥44px</p>
    </div>
  )
}

/* ── 動效 ─────────────────────────────────────────────── */

function MotionDemo() {
  return (
    <Panel tone="before" label="現況" caption="13/13 互動節點無 transition">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-v2-lake px-3 text-[12px] font-bold text-v2-on-lake"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
          新增支出
        </button>
        <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-v2-coral px-3 text-[12px] font-bold text-white">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
          AI 記帳
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-v2-ink-subtle">
        按下去沒有任何視覺回應，只能等畫面跳轉；也沒有 prefers-reduced-motion 處理。
      </p>
    </Panel>
  )
}

function MotionAfter() {
  const [pulse, setPulse] = useState(0)
  return (
    <Panel tone="after" label="調整後" caption="按壓 120ms · 進場 200ms">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPulse((n) => n + 1)}
          className="inline-flex h-11 items-center gap-1.5 rounded-full bg-v2-lake px-4 text-[13px] font-bold text-v2-on-lake transition-transform duration-150 ease-out hover:shadow-v2-lake-md active:scale-[.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake-mid motion-reduce:transition-none"
        >
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          新增支出
        </button>
        <button
          type="button"
          onClick={() => setPulse((n) => n + 1)}
          className="inline-flex h-11 items-center gap-1.5 rounded-full bg-v2-coral px-4 text-[13px] font-bold text-white transition-transform duration-150 ease-out active:scale-[.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-coral-strong motion-reduce:transition-none"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2} />
          AI 記帳
        </button>
        <span className="ml-auto text-[10px] tabular-nums text-v2-ink-subtle">點擊次數 {pulse}</span>
      </div>
      <div key={pulse} className="mt-3 animate-fade-in motion-reduce:animate-none">
        <p className="m-0 text-[12px] leading-5 text-v2-ink-muted">
          回饋原則：按壓縮小 4%、hover 只改陰影、資料更新用 240ms 數字過渡；全部尊重 reduced-motion。
        </p>
      </div>
    </Panel>
  )
}

/* ── 頁面 ─────────────────────────────────────────────── */

export default function UiConsistencyDemoPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-28 pt-8">
      <header>
        <h1 className="m-0 font-v2-serif text-[24px] font-bold leading-tight text-v2-ink">收斂到 v2：一致性對照</h1>
        <p className="m-0 mt-2 max-w-[68ch] text-[13px] leading-relaxed text-v2-ink-muted">
          這是設計對照紀錄。左側是調整前的輸出，右側是調整後的目標；預算、分享、動效三組已套用到 v2 元件，其餘仍為提案。每一組都只改視覺與互動語彙，不改商業邏輯。
        </p>
      </header>

      <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {IMPACT.map((item) => (
          <div key={item.label} className="rounded-[14px] border border-v2-line bg-v2-surface px-3 py-2.5">
            <dt className="text-[11px] leading-4 text-v2-ink-muted">{item.label}</dt>
            <dd className="m-0 mt-0.5 font-v2-serif text-[20px] font-bold leading-7 tabular-nums text-v2-lake">{item.value}</dd>
            <dd className="m-0 text-[10.5px] leading-4 text-v2-ink-subtle">{item.note}</dd>
          </div>
        ))}
      </dl>

      <Section
        title="餘額卡：把付款入口升為主角"
        problem="目前「查看結算明細」是一行 12px 連結，和 13px 標題搶同一行；金額沒有動詞、對象、人數；0 元時只顯示 NT$0。調整後用一句人類語言講清楚「誰欠誰多少」，並把前往結算變成主要按鈕。"
      >
        <Panel tone="before" label="現況" caption="balance-card.tsx">
          <BalanceBefore />
        </Panel>
        <Panel tone="after" label="調整後" caption="同資料 · 新層級">
          <BalanceAfter balance={2400} />
        </Panel>
      </Section>

      <Section
        title="餘額歸零：要有結局，不是一個 0"
        problem="v1 有「已結清」狀態，v2 刪掉了。把 balance 設為 0，看兩種表達的差別。"
      >
        <Panel tone="before" label="現況" caption="balance = 0">
          <div className="rounded-v2-lg border border-v2-line bg-v2-surface px-4 py-3">
            <p className="m-0 text-[13px] font-bold leading-4 text-v2-lake">我的餘額</p>
            <p className="mt-0.5 font-v2-serif text-2xl font-bold leading-8 tabular-nums text-v2-ink">NT$0</p>
          </div>
        </Panel>
        <Panel tone="after" label="調整後" caption="balance = 0">
          <BalanceAfter balance={0} />
        </Panel>
      </Section>

      <Section
        title="預算：超支不該被抹平"
        problem="summary 把 budgetProgress 截在 100，花到 118% 仍顯示 100%，進度條永遠是白色滿版。調整後保留真實比率，用顏色與文字說出「超出多少」。"
      >
        <Panel tone="before" label="現況" caption="project-overview.ts:79">
          <BudgetBefore />
        </Panel>
        <Panel tone="after" label="調整後" caption="未截斷比率">
          <BudgetAfter />
        </Panel>
      </Section>

      <Section
        title="分享：把 v1 彈窗換成 v2 bottom sheet"
        problem="分享目前打開的是 v1 置中 modal，硬寫 slate / blue / LINE 綠；Radix Portal 掛在 body，v2 token 在裡面失效。調整後改用既有的 Sheet：底部升起、focus trap、Esc 關閉。"
      >
        <ShareDemo />
      </Section>

      <Section
        title="尺寸與字級：行動裝置地板"
        problem="分享／修改 pill 只有 32px 高、相距 6px；功能標籤 11px 與 12px 混用。單手操作會誤觸，中文小字會糊。調整後統一 44px 觸控目標與 12px 最小字級。"
      >
        <Panel tone="before" label="現況" caption="32px / 11px">
          <SizeBefore />
        </Panel>
        <Panel tone="after" label="調整後" caption="44px / 12px">
          <SizeAfter />
        </Panel>
      </Section>

      <Section
        title="動效：每個按壓都要有回應"
        problem="總覽 13 個互動節點沒有任何 transition，全 repo 也沒有 prefers-reduced-motion。調整後只建立三種語彙：按壓縮小、hover 改陰影、進場淡入；不用誇張特效。"
      >
        <MotionDemo />
        <MotionAfter />
      </Section>

      <section className="mt-10 border-t border-v2-line pt-6">
        <h2 className="m-0 font-v2-serif text-[18px] font-bold text-v2-ink">影響範圍（若正式收斂 v1 → v2）</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="m-0 text-[13px] font-bold text-v2-lake">會改到的檔案</h3>
            <ul className="mt-2 space-y-1.5 pl-4 text-[12.5px] leading-5 text-v2-ink-muted">
              <li>17 個 <code className="text-[11.5px]">app/**/page.tsx</code>：移除 <code className="text-[11.5px]">UiVersionSwitch</code>，直接渲染 v2。</li>
              <li><code className="text-[11.5px]">lib/ui-version.ts</code>、<code className="text-[11.5px]">lib/hooks/useUiVersion.ts</code>、<code className="text-[11.5px]">components/ui-version/*</code>：可刪或保留唯讀。</li>
              <li><code className="text-[11.5px]">components/ui/*</code>：bottom-sheet、skeleton、badge 等 v1 灰階 primitive 換成 v2 token。</li>
              <li><code className="text-[11.5px]">components/project/invite-dialog.tsx</code>：改用 v2 Sheet。</li>
              <li>11 個測試檔：移除 v1 markup / uiVersion 假設。</li>
            </ul>
          </div>
          <div>
            <h3 className="m-0 text-[13px] font-bold text-v2-lake">不會動到的部分</h3>
            <ul className="mt-2 space-y-1.5 pl-4 text-[12.5px] leading-5 text-v2-ink-muted">
              <li>API routes、Prisma schema、hooks 的資料邏輯。</li>
              <li>v2 的 99 個元件與 12,195 行實作。</li>
              <li>LIFF 登入、語音／OCR、匯出流程。</li>
              <li>舊 v1 檔案可先保留一版做 rollback，確認後再刪 7,733 行。</li>
            </ul>
          </div>
        </div>
        <p className="m-0 mt-4 rounded-[14px] border border-v2-line bg-v2-sand px-4 py-3 text-[12px] leading-5 text-v2-ink-muted">
          風險最高的是「共用 primitive」與「Portal 逃出 v2 scope」兩件事，其餘都是視覺替換。建議分兩批：先換 primitive 與分享彈窗，再移除 v1 路由。
        </p>
      </section>

      <p className="mt-8 text-[11px] leading-relaxed text-v2-ink-subtle">
        此頁只做對照，不代表已套用到產品畫面。要看目前真實畫面，請回{" "}
        <Link href="/demo" className="text-v2-link underline underline-offset-2">
          Demo 目錄
        </Link>
        。
      </p>
    </div>
  )
}
