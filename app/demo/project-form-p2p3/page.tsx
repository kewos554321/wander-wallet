"use client"

// /demo/project-form-p2p3 — before/after for the re-run critique's P2/P3 items.
//   P2 ① 兩頁欄位漂移（placeholder／textarea 內距／CTA 字級）→ 統一
//   P2 ② 錯誤只在底部固定列 → 改到欄位旁（紅框＋紅字）
//   P2 ③ 必填只有裝飾 `*`、未被朗讀 → aria-required ＋ sr-only「必填」（看不到，標註）
//   P3 ④ 刪除確認要打英文 delete → 改中文「刪除」
//   P3 ⑤ sheet 不是 dialog（無 role／Esc／focus trap）→ 有（看不到，標註）

import { Trash2 } from "lucide-react"

const cardClass = "flex flex-col gap-3.5 rounded-[18px] border border-v2-line bg-v2-surface p-4"
const titleClass = "m-0 text-[13px] font-bold text-v2-lake"
const labelClass = "mb-2 block text-xs font-semibold text-v2-ink-muted"

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
      {note ? <p className="m-0 text-[11px] text-v2-ink-muted md:col-span-2">{note}</p> : null}
    </div>
  )
}

const inputBase = "w-full rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-[13px] text-[15px] font-bold tracking-[.3px] outline-none"

export default function ProjectFormP2P3DemoPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="m-0 text-lg font-bold text-v2-ink">旅程表單 · P2＋P3 前後對照</h1>
      <p className="mt-1 text-sm text-v2-ink-muted">
        P2：欄位漂移、錯誤位置、必填 aria。P3：刪除確認語言、sheet dialog 語意。
      </p>

      {/* ① drift */}
      <section className="mt-8">
        <h2 className="m-0 text-base font-bold text-v2-ink">① 兩頁欄位漂移（建立 vs 設定）</h2>
        <p className="mb-4 mt-1 text-sm text-v2-ink-muted">
          同一欄位在兩頁長得不一樣：建立有 placeholder、textarea 內距 13px；設定沒有 placeholder、內距 12px；CTA 字級 16px vs 14px。
        </p>
        <Pair
          note="改後：placeholder、內距、字級、圓角全部同一套（抽成共用 styles），兩頁不可能再各自漂移。"
          before={
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={cardClass}>
                <p className="m-0 text-[11px] font-bold text-v2-ink-muted">建立旅程</p>
                <input readOnly value="東京之旅" className={inputBase} />
                <textarea readOnly rows={2} value="秋季賞楓" className="rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-[13px] text-[13px]" />
                <button type="button" className="rounded-[14px] bg-v2-lake py-[15px] text-base font-bold text-v2-on-lake">建立旅程</button>
              </div>
              <div className={cardClass}>
                <p className="m-0 text-[11px] font-bold text-v2-ink-muted">旅程設定</p>
                <input readOnly value="東京之旅" className="w-full rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-[13px] text-[15px] font-bold tracking-[.3px]" />
                <textarea readOnly rows={2} value="秋季賞楓" className="rounded-xl border border-v2-line bg-v2-paper px-3.5 py-3 text-[13px]" />
                <button type="button" className="rounded-[14px] bg-v2-lake py-3.5 text-sm font-bold text-v2-on-lake">儲存變更</button>
              </div>
            </div>
          }
          after={
            <div className="grid gap-4 sm:grid-cols-2">
              {["建立旅程", "旅程設定"].map((label) => (
                <div key={label} className={cardClass}>
                  <p className="m-0 text-[11px] font-bold text-v2-ink-muted">{label}</p>
                  <input readOnly value="東京之旅" placeholder="例如：日本關西 5 天" className={inputBase} />
                  <textarea readOnly rows={2} value="秋季賞楓" className="rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-[13px] text-[13px]" />
                  <button type="button" className="rounded-[14px] bg-v2-lake py-[15px] text-base font-bold text-v2-on-lake">
                    {label === "建立旅程" ? "建立旅程" : "儲存變更"}
                  </button>
                </div>
              ))}
            </div>
          }
        />
      </section>

      {/* ② error location */}
      <section className="mt-10">
        <h2 className="m-0 text-base font-bold text-v2-ink">② 錯誤顯示位置</h2>
        <p className="mb-4 mt-1 text-sm text-v2-ink-muted">
          現在驗證錯誤只出現在底部固定列，使用者要自己找是哪個欄位錯。
        </p>
        <Pair
          note="改後：錯的欄位自己變紅框＋欄位下方紅字，並自動聚焦到它；底部固定列只留伺服器錯誤。"
          before={
            <div className={cardClass}>
              <p className={titleClass}>基本資訊</p>
              <label className={labelClass}>旅程名稱 <span className="text-v2-danger">*</span></label>
              <input readOnly value="" className={inputBase} />
              <div className="mt-2 rounded-[12px] border border-v2-danger-border bg-v2-danger-tint px-3 py-2 text-center text-xs font-semibold text-v2-danger">
                請輸入旅程名稱
              </div>
              <p className="m-0 text-center text-[10px] text-v2-ink-subtle">↑ 這是底部的固定列，離欄位很遠</p>
            </div>
          }
          after={
            <div className={cardClass}>
              <p className={titleClass}>基本資訊</p>
              <label className={labelClass}>旅程名稱 <span className="text-v2-danger">*</span></label>
              <input readOnly value="" aria-invalid="true" className={`${inputBase} border-v2-danger ring-2 ring-v2-danger/20`} />
              <p className="m-0 -mt-2 text-xs font-semibold text-v2-danger">請輸入旅程名稱</p>
            </div>
          }
        />
      </section>

      {/* ③ required aria */}
      <section className="mt-10">
        <h2 className="m-0 text-base font-bold text-v2-ink">③ 必填標示（螢幕閱讀器）</h2>
        <p className="mb-4 mt-1 text-sm text-v2-ink-muted">
          現在 `*` 只是視覺裝飾，而且 input 的 <code>aria-label</code> 蓋掉 label，所以讀屏完全不知道這欄必填。
        </p>
        <Pair
          note={'改後：input 加 aria-required="true"，並把 * 換成 sr-only「必填」——視覺一模一樣，但讀屏會唸「旅程名稱，必填」。'}
          before={
            <div className={cardClass}>
              <label className={labelClass}>旅程名稱 <span className="text-v2-danger">*</span></label>
              <input readOnly value="東京之旅" aria-label="旅程名稱" className={inputBase} />
              <p className="m-0 text-[11px] text-v2-ink-muted">讀屏唸出：「旅程名稱」— 沒有「必填」</p>
            </div>
          }
          after={
            <div className={cardClass}>
              <label className={labelClass}>
                旅程名稱 <span className="text-v2-danger" aria-hidden="true">*</span>
                <span className="sr-only">必填</span>
              </label>
              <input readOnly value="東京之旅" aria-label="旅程名稱" aria-required="true" className={inputBase} />
              <p className="m-0 text-[11px] text-v2-ink-muted">讀屏唸出：「旅程名稱，必填」</p>
            </div>
          }
        />
      </section>

      {/* ④ delete confirm */}
      <section className="mt-10">
        <h2 className="m-0 text-base font-bold text-v2-ink">④ 刪除確認的輸入字</h2>
        <p className="mb-4 mt-1 text-sm text-v2-ink-muted">
          全中文介面卻要求打英文 <code>delete</code>，對非英語使用者是個多餘障礙。
        </p>
        <Pair
          note="改後：改成輸入中文「刪除」。（`delete` 這個字是從 v1 沿用至今。）"
          before={
            <div className={`${cardClass} max-w-sm`}>
              <p className="m-0 font-v2-serif text-base font-semibold">確認刪除旅程</p>
              <p className="m-0 text-xs text-v2-ink-muted">刪除旅程後，所有成員、支出紀錄都會永久移除，此操作無法復原。請輸入 delete 以確認。</p>
              <input readOnly value="" placeholder="delete" className="w-full rounded-xl border border-v2-line px-3.5 py-2.5 text-sm" />
              <button type="button" disabled className="rounded-xl bg-v2-danger py-3 text-sm font-bold text-v2-on-lake opacity-40">永久刪除</button>
            </div>
          }
          after={
            <div className={`${cardClass} max-w-sm`}>
              <p className="m-0 font-v2-serif text-base font-semibold">確認刪除旅程</p>
              <p className="m-0 text-xs text-v2-ink-muted">刪除旅程後，所有成員、支出紀錄都會永久移除，此操作無法復原。請輸入「刪除」以確認。</p>
              <input readOnly value="" placeholder="刪除" className="w-full rounded-xl border border-v2-line px-3.5 py-2.5 text-sm" />
              <button type="button" disabled className="rounded-xl bg-v2-danger py-3 text-sm font-bold text-v2-on-lake opacity-40">永久刪除</button>
            </div>
          }
        />
      </section>

      {/* ⑤ sheet dialog semantics */}
      <section className="mt-10 pb-10">
        <h2 className="m-0 text-base font-bold text-v2-ink">⑤ sheet 的 dialog 語意（看不到）</h2>
        <p className="mb-4 mt-1 text-sm text-v2-ink-muted">
          封面選單與刪除確認都是「裸的 fixed 覆蓋層」：沒有 <code>{'role="dialog"'}</code>／<code>aria-modal</code>、不能按 Esc 或點背景關、焦點會跑到背後頁面；而 App 其他地方（匯率面板、分享、個人資料）都是正確的 dialog。
        </p>
        <Pair
          note="改後：沿用 App 既有的 dialog 版本（role/aria-modal、Esc、點背景關、focus trap）。這是純無障礙修正，畫面幾乎不變。"
          before={
            <ul className="m-0 list-disc rounded-[18px] border border-v2-line bg-v2-surface p-4 pl-7 text-[13px] text-v2-ink-muted">
              <li>無 <code>{'role="dialog"'}</code> / <code>aria-modal</code></li>
              <li>Esc 關不掉、點背景關不掉</li>
              <li>Tab 會跑到背後的欄位</li>
              <li>與 v2 其他 dialog 不一致</li>
            </ul>
          }
          after={
            <ul className="m-0 list-disc rounded-[18px] border border-v2-line bg-v2-surface p-4 pl-7 text-[13px] text-v2-ink-muted">
              <li>✅ <code>{'role="dialog"'}</code> / <code>{'aria-modal="true"'}</code></li>
              <li>✅ 按 Esc、點背景都可關</li>
              <li>✅ focus trap 留在 sheet 內，關閉後回到觸發鈕</li>
              <li>✅ 與 v2 其他 dialog 一致</li>
            </ul>
          }
        />
        <div className="mt-4 flex items-center gap-2 text-[12px] text-v2-ink-muted">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          補充：刪除對話框目前用自製 overlay（程式註解也承認 <code>confirm-sheet</code> 還不存在）；做 ⑤ 時可一併抽成共用元件。
        </div>
      </section>
    </div>
  )
}
