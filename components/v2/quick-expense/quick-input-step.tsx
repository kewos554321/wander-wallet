"use client"

import { useRef } from "react"
import { Camera, Loader2, Mic, Sparkles, Square, X } from "lucide-react"
import { useSpeechInput } from "@/lib/quick-expense/speech-input"

export const EXAMPLES = ["早餐 100 我付", "晚餐 600 大家分", "計程車 250 小明付"]

export function QuickInputStep({ text, onTextChange, onParse, onCamera, onClose, error }: {
  text: string
  onTextChange: (text: string) => void
  onParse: () => void
  onCamera: () => void
  onClose: () => void
  error: string | null
}) {
  const textRef = useRef(text)
  textRef.current = text
  const append = (extra: string) => {
    const current = textRef.current.trim()
    onTextChange(current ? `${current} ${extra}` : extra)
  }
  const speech = useSpeechInput({ onText: append })
  const busy = speech.recording || speech.transcribing
  const shownError = error ?? speech.error

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="m-0 flex items-center gap-1.5 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-v2-lake" aria-hidden="true" />
          AI 快速記帳
        </p>
        <button type="button" aria-label="關閉" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-v2-lake-soft">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-4 mb-4">
        <p className="mb-2.5 text-sm font-medium">說出或輸入消費內容</p>
        <div className="relative">
          <textarea
            aria-label="消費內容"
            rows={5}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="例如：早餐 100 我付、晚餐 600 大家分……"
            className="w-full resize-none rounded-2xl border border-v2-line bg-v2-surface px-3.5 py-3 pr-14 text-[13px] outline-none"
          />
          {speech.supported && (
            <button
              type="button"
              aria-label="語音輸入"
              aria-pressed={speech.recording}
              disabled={speech.transcribing}
              onClick={speech.toggle}
              className={`absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full ${speech.recording ? "bg-v2-danger text-white" : "bg-v2-lake text-white"}`}
            >
              {speech.transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : speech.recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-v2-ink-muted">支援一次多筆、不同付款人 · 點麥克風可語音輸入</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => append(ex)} className="rounded-full border border-[#DDEDE6] bg-v2-lake-soft px-3 py-[5px] text-xs font-semibold">
              {ex}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={onCamera} className="mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-v2-line bg-v2-surface px-3.5 py-3 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D2EAE1] text-v2-lake" aria-hidden="true">
          <Camera className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[13px] font-bold">拍照或掃描收據</span>
          <span className="block text-xs text-v2-ink-muted">AI 自動辨識金額與品項</span>
        </span>
      </button>

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
          className="w-full rounded-[14px] bg-v2-lake py-3.5 text-sm font-bold text-white disabled:opacity-40"
        >
          AI 解析
        </button>
      </div>
    </div>
  )
}
