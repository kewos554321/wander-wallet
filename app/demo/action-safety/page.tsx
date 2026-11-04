"use client"

import { useState } from "react"
import { AlertAnnouncementDemo } from "./alert-announcement-demo"
import { CtaDemo } from "./cta-demo"
import { DeleteDemo } from "./delete-demo"
import { NotifyCheckboxDemo } from "./notify-checkbox-demo"

type View = "before" | "after"

const COMMON_POINTS = [
  {
    label: "位置",
    text: "錯誤要在動作旁邊。footer 是使用者按下去的地方，就該在那裡說為什麼不能按。",
  },
  {
    label: "確認",
    text: "破壞性操作要指認目標與後果。這輪不做 undo，所以文案不能承諾可以復原。",
  },
  {
    label: "朗讀",
    text: "同一個錯誤只留一個 alert。視覺提示可以重複，螢幕閱讀器不要念兩次。",
  },
  {
    label: "元件",
    text: "同一個設定用同一套列。v1 checkbox 走進 v2 sheet，會露出尺寸與字級的破口。",
  },
  {
    label: "範圍",
    text: "這些改動都不碰分攤入口與資料模型；只把「什麼時候說、在哪裡說、用什麼元件說」補起來。",
  },
]

export default function ActionSafetyDemoPage() {
  const [ctaView, setCtaView] = useState<View>("after")
  const [deleteView, setDeleteView] = useState<View>("after")
  const [alertView, setAlertView] = useState<View>("after")
  const [notifyView, setNotifyView] = useState<View>("after")

  return (
    <div className="mx-auto max-w-md pb-28">
      <div className="px-4 pt-6">
        <h1 className="m-0 font-v2-serif text-[22px] font-bold leading-7 text-v2-ink">
          卡住與刪除 · 改前／改後
        </h1>
        <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-v2-ink-muted">
          兩個最容易讓人停在半路的地方，外加兩個一放大就會露出的細節：錯誤被念兩次、
          v1 checkbox 走進 v2 sheet。四個改動都不碰分攤入口。
        </p>
      </div>

      <section className="mt-5">
        <div className="px-4">
          <h2 className="m-0 font-v2-serif text-lg font-bold leading-6 text-v2-ink">1. 主要 CTA 卡住時</h2>
          <ViewToggle view={ctaView} onChange={setCtaView} label="切換 CTA 版本" />
        </div>
        <div className="mt-3">
          <CtaDemo key={ctaView} view={ctaView} />
        </div>
        <p className="m-0 mt-2 px-4 text-[12px] leading-5 text-v2-ink-muted">
          {ctaView === "before"
            ? "改前：錯誤在分攤區底部，footer 只看到變灰的按鈕。使用者得自己往下找。"
            : "改後：footer 直接說原因；整行可點，會捲到分攤區並高亮 1.8 秒。"}
        </p>
      </section>

      <section className="mt-8">
        <div className="px-4">
          <h2 className="m-0 font-v2-serif text-lg font-bold leading-6 text-v2-ink">2. 刪除一筆支出</h2>
          <ViewToggle view={deleteView} onChange={setDeleteView} label="切換刪除版本" />
        </div>
        <div className="mt-3">
          <DeleteDemo key={deleteView} view={deleteView} />
        </div>
        <p className="m-0 mt-2 px-4 text-[12px] leading-5 text-v2-ink-muted">
          {deleteView === "before"
            ? "改前：對話框只說「無法復原」，沒有說是哪一筆；確認後直接消失。"
            : "改後：sheet 先把目標（名稱、金額、付款人、日期）講清楚；確認後立即刪除。"}
        </p>
      </section>

      <section className="mt-8">
        <div className="px-4">
          <h2 className="m-0 font-v2-serif text-lg font-bold leading-6 text-v2-ink">3. 錯誤只念一次</h2>
          <ViewToggle view={alertView} onChange={setAlertView} label="切換錯誤朗讀版本" />
        </div>
        <div className="mt-3">
          <AlertAnnouncementDemo key={alertView} view={alertView} />
        </div>
        <p className="m-0 mt-2 px-4 text-[12px] leading-5 text-v2-ink-muted">
          {alertView === "before"
            ? "改前：inline 與 footer 都是 alert，同一句會被念兩次。"
            : "改後：footer 保留 alert；inline 改成 status，視覺提示還在，但只朗讀一次。"}
        </p>
      </section>

      <section className="mt-8">
        <div className="px-4">
          <h2 className="m-0 font-v2-serif text-lg font-bold leading-6 text-v2-ink">4. LINE 通知 checkbox</h2>
          <ViewToggle view={notifyView} onChange={setNotifyView} label="切換通知 checkbox 版本" />
        </div>
        <div className="mt-3">
          <NotifyCheckboxDemo key={notifyView} view={notifyView} />
        </div>
        <p className="m-0 mt-2 px-4 text-[12px] leading-5 text-v2-ink-muted">
          {notifyView === "before"
            ? "改前：v1 checkbox 走進 v2 sheet，顏色跟著 token，但尺寸與字級沒對齊。"
            : "改後：改用現有的 v2 CheckboxRow，跟其他設定列同一套密度。"}
        </p>
      </section>

      <section className="mt-8 px-4">
        <h2 className="m-0 font-v2-serif text-lg font-bold leading-6 text-v2-ink">這些細節的共同點</h2>
        <dl className="mt-2 divide-y divide-v2-line border-y border-v2-line">
          {COMMON_POINTS.map((point) => (
            <div key={point.label} className="grid grid-cols-[56px_1fr] gap-3 py-3">
              <dt className="m-0 text-[12px] font-bold text-v2-ink-muted">{point.label}</dt>
              <dd className="m-0 text-[13px] leading-5 text-v2-ink">{point.text}</dd>
            </div>
          ))}
        </dl>
        <p className="m-0 mt-4 text-[12px] leading-5 text-v2-ink-muted">
          分攤入口維持改前；這頁處理 CTA、刪除，以及朗讀與通知 checkbox 兩個細節。
          刪除 demo 可以在空白狀態按「重設 demo」重來。
        </p>
      </section>
    </div>
  )
}

function ViewToggle({ view, onChange, label }: { view: View; onChange: (view: View) => void; label: string }) {
  return (
    <div className="mt-2" role="group" aria-label={label}>
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
            onClick={() => onChange(option.value)}
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
  )
}
