"use client"

import { Camera, Image as ImageIcon, Loader2, Mic, Sparkles, Square, X } from "lucide-react"
import { useSpeechInput } from "@/lib/quick-expense/speech-input"
import { SECTION_CARD } from "@/components/v2/expense-form/section-card"

export const EXAMPLES = ["早餐 100 我付", "晚餐 600 大家分", "計程車 250 小明付", "超市 1280 我付 800、小明 480"]

export function QuickInputStep({ text, onTextChange, onParse, onCamera, onGallery, onClose, error }: {
  text: string
  onTextChange: (text: string) => void
  onParse: () => void
  onCamera: () => void
  onGallery: () => void
  onClose: () => void
  error: string | null
}) {
  const append = (extra: string) => {
    const current = text.trim()
    onTextChange(current ? `${current} ${extra}` : extra)
  }
  const speech = useSpeechInput({ onText: append })
  const busy = speech.recording || speech.transcribing
  const shownError = error ?? speech.error

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <button type="button" aria-label="關閉" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-v2-sand">
          <X className="h-4 w-4" />
        </button>
        <h1 className="m-0 font-v2-serif text-[17px] font-semibold">AI 快速記帳</h1>
        <span className="h-8 w-8" aria-hidden="true" />
      </div>

      <div className={`${SECTION_CARD} mt-5`}>
        <p className="mb-1 text-[13px] font-bold text-v2-lake">說出或輸入消費內容</p>
        <p className="mb-3 text-xs text-v2-ink-subtle">支援一次多筆；點麥克風可語音輸入</p>
        <div className="relative">
          <textarea
            aria-label="消費內容"
            rows={5}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="例如：晚餐 600 大家分、我付 800 小明 480"
            className="min-h-20 w-full resize-none rounded-[14px] border border-v2-line bg-v2-paper px-3.5 py-3.5 pr-14 text-[13px] outline-none"
          />
          {speech.supported && (
            <button
              type="button"
              aria-label="語音輸入"
              aria-pressed={speech.recording}
              disabled={speech.transcribing}
              onClick={speech.toggle}
              className={`absolute bottom-2.5 right-2.5 flex h-[38px] w-[38px] items-center justify-center rounded-full shadow-[0_4px_10px_rgba(27,88,71,.3)] ${speech.recording ? "bg-v2-danger text-v2-on-lake" : "bg-v2-lake text-v2-on-lake"}`}
            >
              {speech.transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : speech.recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      <div className="mx-4 mt-3 flex gap-1.5 overflow-x-auto">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => append(ex)} className="flex-shrink-0 rounded-full bg-v2-sand px-3 py-1.5 text-xs font-semibold text-v2-ink-muted">
            {ex}
          </button>
        ))}
      </div>

      <div className={`${SECTION_CARD} mt-5`}>
        <p className="mb-2 text-[13px] font-bold text-v2-lake">收據/消費圖片</p>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCamera}
            className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-v2-check bg-v2-paper px-2.5 py-4 text-v2-ink-muted"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-v2-coral-soft text-v2-coral" aria-hidden="true">
              <Camera className="h-[15px] w-[15px]" />
            </span>
            <span className="text-xs font-semibold">拍照</span>
          </button>
          <button
            type="button"
            onClick={onGallery}
            className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-v2-check bg-v2-paper px-2.5 py-4 text-v2-ink-muted"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-v2-lake-soft text-v2-lake" aria-hidden="true">
              <ImageIcon className="h-[15px] w-[15px]" />
            </span>
            <span className="text-xs font-semibold">選擇圖片</span>
          </button>
        </div>
        <p className="mt-2 text-xs text-v2-ink-subtle">AI 自動辨識金額與品項</p>
      </div>

      <div className="mt-auto border-t border-v2-line bg-v2-surface px-4 py-3.5">
        {shownError && (
          <p role="alert" className="mb-2 text-xs font-bold text-v2-danger">
            {shownError}
          </p>
        )}
        <button
          type="button"
          disabled={!text.trim() || busy}
          onClick={onParse}
          className="flex w-full items-center justify-center gap-1.5 rounded-[14px] bg-v2-lake py-[15px] text-[15px] font-bold text-v2-on-lake disabled:opacity-40"
        >
          <Sparkles className="h-[15px] w-[15px]" aria-hidden="true" />
          AI 解析
        </button>
      </div>
    </div>
  )
}
