"use client"

import { useState } from "react"
import { QuickInputStep, type QuickInputMode } from "@/components/v2/quick-expense/quick-input-step"
import { ConfirmStep } from "@/components/v2/quick-expense/confirm-step"
import type { QuickItem } from "@/lib/quick-expense/draft"
import { DEMO_CURRENCY, DEMO_LIVE_RATE, DEMO_MEMBERS, DEMO_QUICK_ITEMS } from "@/app/demo/_data/fixtures"

// The quick-expense flow's two real steps, driven by local state. Parsing /
// saving / camera are demo no-ops (no backend, no device).
export default function QuickExpenseDemoPage() {
  const [step, setStep] = useState<"input" | "confirm">("input")
  const [mode, setMode] = useState<QuickInputMode>("text")
  const [text, setText] = useState("晚餐 1280 我付")
  const [items, setItems] = useState<QuickItem[]>(DEMO_QUICK_ITEMS)
  const [index, setIndex] = useState(0)

  const stepButton = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-[12px] font-bold ${active ? "bg-v2-lake text-v2-on-lake" : "border border-v2-line bg-v2-surface text-v2-ink"}`

  return (
    <div className="mx-auto max-w-md">
      <div className="flex gap-2 px-4 pt-4">
        <button
          type="button"
          aria-label="文字步驟"
          onClick={() => setStep("input")}
          className={stepButton(step === "input")}
        >
          文字／語音
        </button>
        <button
          type="button"
          aria-label="確認步驟"
          onClick={() => setStep("confirm")}
          className={stepButton(step === "confirm")}
        >
          確認清單
        </button>
      </div>

      {step === "input" ? (
        <QuickInputStep
          text={text}
          onTextChange={setText}
          onParse={() => setStep("confirm")}
          onCamera={() => alert("（demo）相機")}
          onGallery={() => alert("（demo）相簿")}
          onClose={() => alert("（demo）關閉")}
          error={null}
          image={null}
          onImageRemove={() => {}}
          mode={mode}
          onModeChange={setMode}
        />
      ) : (
        <ConfirmStep
          items={items}
          members={DEMO_MEMBERS}
          index={Math.min(index, items.length - 1)}
          onIndexChange={setIndex}
          onItemChange={(index, updater) => setItems((prev) => prev.map((it, i) => (i === index ? { ...updater(it), id: it.id } : it)))}
          onRemoveItem={(index) => setItems((prev) => prev.filter((_, i) => i !== index))}
          onReinput={() => setStep("input")}
          onSubmit={() => alert("（demo）新增支出")}
          onClose={() => setStep("input")}
          canNotifyLine={false}
          notifyLine={false}
          onNotifyLineChange={() => {}}
          error={null}
          projectCurrency={DEMO_CURRENCY}
          previewRateInfo={() => ({ rate: DEMO_LIVE_RATE, source: "live" })}
        />
      )}
    </div>
  )
}
