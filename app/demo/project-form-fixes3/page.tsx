"use client"

// /demo/project-form-fixes3 — before/after for the THIRD critique run (29/40).
//   P1  結算幣別 focus 看不到（透明 trigger 把 ring 畫在看不見的元素上）
//   P2a 修好欄位後，舊驗證錯誤會「復活」跳到下方固定列
//   P2b 只顯示第一個錯誤欄位
//   P2c Sheet 每次父層重繪就把焦點拉回面板（看不到，標註）
//   P3  破壞流程細節未統一（兩個紅／文案不一致／無 placeholder／未 trim）

import { CARD, CARD_TITLE, FIELD_ERROR, FIELD_LABEL, HELP_TEXT } from "@/components/v2/project/trip-form-styles"

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

// A stand-in for V2CurrencyField: an aria-hidden chrome div with a transparent
// select overlaid on top (that overlay is what focuses).
function CurrencyField({ focused, ringed }: { focused: boolean; ringed: boolean }) {
  const ring = ringed ? "border-v2-lake ring-2 ring-v2-lake/30" : ""
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className={`flex w-full items-center justify-between rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-3 text-[13px] text-v2-ink ${
          focused ? ring : ""
        } ${focused && !ringed ? "outline-none" : ""}`}
      >
        <span className="font-semibold">TWD 新台幣</span>
        <span className="text-v2-ink-subtle">▾</span>
      </div>
    </div>
  )
}

export default function ProjectFormFixes3DemoPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="m-0 text-lg font-bold text-v2-ink">旅程表單 · 第 3 輪 P1＋P2＋P3 前後對照</h1>
      <p className="mt-1 text-sm text-v2-ink-muted">分數 23 → 25 → 29／40。以下是 29 分之後剩下的問題。</p>

      {/* P1 */}
      <section className="mt-8">
        <h2 className="m-0 text-base font-bold text-v2-ink">① P1 · 結算幣別的 focus 看不到</h2>
        <p className="mb-4 mt-1 text-sm text-v2-ink-muted">
          這個欄位是「看得見的樣式 div」＋疊在上面的**透明** select。focus 是發生在透明 select 上，所以 focus ring 畫在**看不見**的元素上 —— 鍵盤使用者完全不知道游標在哪（兩頁都是）。
        </p>
        <Pair
          note="改後：把 focus 狀態鏡射到看得見的那層（focus-within）。左邊那格是 focus 中但沒有任何提示；右邊一看就知道在哪。"
          before={
            <div className={CARD}>
              <p className={CARD_TITLE}>結算幣別</p>
              <p className={HELP_TEXT}>所有費用將以此幣別進行結算計算</p>
              <CurrencyField focused ringed={false} />
              <p className="m-0 text-[11px] text-v2-ink-muted">↑ 這格其實是 focus 中的，但看不出來</p>
            </div>
          }
          after={
            <div className={CARD}>
              <p className={CARD_TITLE}>結算幣別</p>
              <p className={HELP_TEXT}>所有費用將以此幣別進行結算計算</p>
              <CurrencyField focused ringed />
              <p className="m-0 text-[11px] text-v2-ink-muted">↑ 同樣是 focus 中，現在有邊框＋淡光</p>
            </div>
          }
        />
      </section>

      {/* P2a */}
      <section className="mt-10">
        <h2 className="m-0 text-base font-bold text-v2-ink">② P2 · 修好欄位後，舊錯誤不該復活</h2>
        <p className="mb-4 mt-1 text-sm text-v2-ink-muted">
          規則：欄位旁錯誤只在「無效」時出現。但底部的固定列條件是「有錯誤 且 欄位有效」，所以你把名稱填好之後，舊訊息會**從欄位旁跳到底部**，變成一個已修正的表單還在報錯。
        </p>
        <Pair
          note="改後：編輯任何欄位就清掉 submit error；底部只留伺服器錯誤。填好就真的乾淨了。"
          before={
            <div className={CARD}>
              <p className={CARD_TITLE}>基本資訊</p>
              <label className={FIELD_LABEL}>旅程名稱</label>
              <input readOnly value="東京之旅" className="w-full rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-[13px] text-[15px] font-bold" />
              <div className="rounded-[12px] border border-v2-danger-border bg-v2-danger-tint px-3 py-2 text-center text-xs font-semibold text-v2-danger">
                請輸入旅程名稱
              </div>
              <p className="m-0 text-[11px] text-v2-ink-muted">↑ 名稱已填好，錯誤卻跑到下方固定列</p>
            </div>
          }
          after={
            <div className={CARD}>
              <p className={CARD_TITLE}>基本資訊</p>
              <label className={FIELD_LABEL}>旅程名稱</label>
              <input readOnly value="東京之旅" className="w-full rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-[13px] text-[15px] font-bold" />
              <p className="m-0 text-[11px] text-v2-ink-muted">↑ 沒有殘留錯誤</p>
            </div>
          }
        />
      </section>

      {/* P2b */}
      <section className="mt-10">
        <h2 className="m-0 text-base font-bold text-v2-ink">③ P2 · 所有錯的欄位都要顯示</h2>
        <p className="mb-4 mt-1 text-sm text-v2-ink-muted">
          `validateProjectFormError` 只回傳**第一個**錯誤。名稱空白＋預算是亂的 → 使用者修好名稱、再送出，才發現預算也有問題（多一趟來回）。
        </p>
        <Pair
          note="改後：回傳 field→message 對照，每個錯的欄位各自標紅＋顯示訊息，一次看完。"
          before={
            <div className={CARD}>
              <p className={CARD_TITLE}>一次只講一個</p>
              <label className={FIELD_LABEL}>旅程名稱</label>
              <input readOnly value="" className="w-full rounded-[12px] border border-v2-danger bg-v2-paper px-3.5 py-[13px]" />
              <p role="alert" className={FIELD_ERROR}>請輸入旅程名稱</p>
              <label className={`${FIELD_LABEL} mt-2`}>旅程預算</label>
              <input readOnly value="abc" className="w-full rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-3 text-[13px]" />
              <p className="m-0 text-[11px] text-v2-ink-subtle">↑ 預算也是錯的，但完全沒提示</p>
            </div>
          }
          after={
            <div className={CARD}>
              <p className={CARD_TITLE}>一次全部講</p>
              <label className={FIELD_LABEL}>旅程名稱</label>
              <input readOnly value="" className="w-full rounded-[12px] border border-v2-danger bg-v2-paper px-3.5 py-[13px]" />
              <p role="alert" className={FIELD_ERROR}>請輸入旅程名稱</p>
              <label className={`${FIELD_LABEL} mt-2`}>旅程預算</label>
              <input readOnly value="abc" className="w-full rounded-[12px] border border-v2-danger bg-v2-paper px-3.5 py-3 text-[13px]" />
              <p role="alert" className={FIELD_ERROR}>預算需為 0 以上的數字</p>
            </div>
          }
        />
      </section>

      {/* P2c */}
      <section className="mt-10">
        <h2 className="m-0 text-base font-bold text-v2-ink">④ P2 · Sheet 不該一直搶焦點（看不到）</h2>
        <p className="mb-4 mt-1 text-sm text-v2-ink-muted">
          Sheet 的 effect 依賴含 <code>onClose</code>，而呼叫方傳 inline arrow → 每次父層重繪就重跑一次：先把焦點還原、再抓回面板。結果是**在封面選單裡每點一個圖示，焦點就被拉回面板頂端**，鍵盤使用者會迷路。
        </p>
        <Pair
          note="改後：把 onClose 收進 ref、focus trap／還原只在 open 變化時跑 → 選封面時焦點留在你點的那顆，不會亂跳。"
          before={
            <ul className="m-0 list-disc rounded-[18px] border border-v2-line bg-v2-surface p-4 pl-7 text-[13px] text-v2-ink-muted">
              <li>依賴 <code>onClose</code> → 每次重繪都重跑</li>
              <li>cleanup 先把焦點還原到觸發鈕</li>
              <li>再 <code>panel.focus()</code> 抓回面板頂端</li>
              <li>每選一個封面＝焦點被搶一次</li>
            </ul>
          }
          after={
            <ul className="m-0 list-disc rounded-[18px] border border-v2-line bg-v2-surface p-4 pl-7 text-[13px] text-v2-ink-muted">
              <li>✅ <code>onClose</code> 收進 ref，不進 deps</li>
              <li>✅ trap／還原只在 <code>open</code> 變化時跑</li>
              <li>✅ 選封面時焦點留在你點的那顆</li>
              <li>✅ 關閉時才把焦點還給觸發鈕</li>
            </ul>
          }
        />
      </section>

      {/* P3 */}
      <section className="mt-10 pb-10">
        <h2 className="m-0 text-base font-bold text-v2-ink">⑤ P3 · 破壞流程細節統一</h2>
        <p className="mb-4 mt-1 text-sm text-v2-ink-muted">
          同一個「刪除」動作：危險區按鈕用 `<code>v2-danger-strong</code>`、確認鈕用 `<code>v2-danger</code>`（兩種紅）；文案「所有成員**與**支出紀錄」vs「所有成員**、**支出紀錄」；確認輸入沒有 placeholder，而且比對未 trim（貼上多一個空格就按不下去）。
        </p>
        <Pair
          note="改後：同一組紅色 token、同一句文案、加上 placeholder，並用 trim 後比對。"
          before={
            <div className={`${CARD} max-w-sm`}>
              <p className="m-0 mb-1 text-[13px] font-bold text-v2-danger-strong">危險區域</p>
              <p className="m-0 mb-3 text-xs text-v2-danger-strong">刪除旅程後，所有成員與支出紀錄都會永久移除，此操作無法復原。</p>
              <button type="button" className="rounded-full bg-v2-danger-strong px-4 py-[9px] text-xs font-bold text-v2-on-lake">刪除旅程</button>
              <hr className="my-3 border-v2-line" />
              <p className="m-0 text-xs text-v2-ink-muted">請輸入「刪除」以確認。</p>
              <input readOnly value="" className="w-full rounded-xl border border-v2-line px-3.5 py-2.5 text-sm" />
              <button type="button" className="mt-2 w-full rounded-xl bg-v2-danger py-3 text-sm font-bold text-v2-on-lake">永久刪除</button>
              <p className="m-0 mt-2 text-[11px] text-v2-ink-subtle">↑ 兩個紅、兩句文案、無 placeholder、未 trim</p>
            </div>
          }
          after={
            <div className={`${CARD} max-w-sm`}>
              <p className="m-0 mb-1 text-[13px] font-bold text-v2-danger-strong">危險區域</p>
              <p className="m-0 mb-3 text-xs text-v2-danger-strong">刪除旅程後，所有成員、支出紀錄都會永久移除，此操作無法復原。</p>
              <button type="button" className="rounded-full bg-v2-danger-strong px-4 py-[9px] text-xs font-bold text-v2-on-lake">刪除旅程</button>
              <hr className="my-3 border-v2-line" />
              <p className="m-0 text-xs text-v2-ink-muted">請輸入「刪除」以確認。</p>
              <input readOnly value="" placeholder="刪除" className="w-full rounded-xl border border-v2-line px-3.5 py-2.5 text-sm" />
              <button type="button" className="mt-2 w-full rounded-xl bg-v2-danger-strong py-3 text-sm font-bold text-v2-on-lake">永久刪除</button>
              <p className="m-0 mt-2 text-[11px] text-v2-ink-muted">↑ 同一個紅、同一句、有 placeholder、trim 比對</p>
            </div>
          }
        />
      </section>
    </div>
  )
}
