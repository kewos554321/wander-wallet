"use client"

import { Camera, Image as ImageIcon, Loader2, Mic, SendHorizontal, Square, X } from "lucide-react"
import { useSpeechInput } from "@/lib/quick-expense/speech-input"
import { SECTION_CARD } from "@/components/v2/expense-form/section-card"

export const EXAMPLES = ["早餐 100 我付", "晚餐 600 大家分", "計程車 250 小明付", "超市 1280 我付 800、小明 480"]

export type QuickInputMode = "text" | "image"

export function QuickInputStep({ text, onTextChange, onParse, onCamera, onGallery, onClose, error, image, onImageRemove, mode, onModeChange }: {
  text: string
  onTextChange: (text: string) => void
  onParse: () => void
  onCamera: () => void
  onGallery: () => void
  onClose: () => void
  error: string | null
  image: string | null
  onImageRemove: () => void
  mode: QuickInputMode
  onModeChange: (mode: QuickInputMode) => void
}) {
  const append = (extra: string) => {
    const current = text.trim()
    const incoming = extra.trim()
    // Voice input can be delivered twice; never append the same phrase again.
    if (!incoming || current === incoming) return
    onTextChange(current ? `${current} ${incoming}` : incoming)
  }
  const speech = useSpeechInput({ onText: append })
  const busy = speech.recording || speech.transcribing
  const shownError = error ?? speech.error
  const canParse = mode === "image" ? Boolean(image) : Boolean(text.trim())

  const tabClass = (active: boolean) =>
    `rounded-[11px] px-3 py-2 text-[13px] font-bold ${active ? "bg-v2-lake text-v2-on-lake" : "text-v2-ink-muted"}`

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between border-b border-v2-line px-4 py-4">
        <button type="button" aria-label="關閉" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-v2-sand">
          <X className="h-4 w-4" />
        </button>
        <h1 className="m-0 font-v2-serif text-[17px] font-semibold">AI 快速記帳</h1>
        <span className="h-8 w-8" aria-hidden="true" />
      </div>

      {/* 語音/文字與圖片解析只能擇一，用兩段式切換讓模式一開始就看得見 */}
      <div className="mx-4 mt-5 grid grid-cols-2 gap-1 rounded-[14px] border border-v2-line bg-v2-surface p-1">
        <button type="button" aria-pressed={mode === "text"} onClick={() => onModeChange("text")} className={tabClass(mode === "text")}>
          文字／語音
        </button>
        <button type="button" aria-pressed={mode === "image"} onClick={() => onModeChange("image")} className={tabClass(mode === "image")}>
          拍照／圖片
        </button>
      </div>

      {mode === "text" ? (
        <>
          <div className={`${SECTION_CARD} mt-4`}>
            <p className="mb-1 text-[13px] font-bold text-v2-lake">說出或輸入消費內容</p>
            <p className="mb-3 text-xs text-v2-ink-subtle">支援一次多筆；點麥克風可語音輸入</p>
            <div className="relative">
              <textarea
                aria-label="消費內容"
                rows={5}
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder="例如：晚餐 600 大家分、我付 800 小明 480"
                className="min-h-20 w-full resize-none rounded-[14px] border border-v2-line bg-v2-paper px-3.5 py-3.5 pr-[104px] text-[13px] outline-none"
              />
              {text.trim() && (
                <button
                  type="button"
                  aria-label="清除文字"
                  onClick={() => onTextChange("")}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-v2-ink/60 text-v2-paper"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
                {speech.supported && (
                  <button
                    type="button"
                    aria-label="語音輸入"
                    aria-pressed={speech.recording}
                    disabled={speech.transcribing}
                    onClick={speech.toggle}
                    className={`flex h-[38px] w-[38px] items-center justify-center rounded-full border ${speech.recording ? "border-transparent bg-v2-danger text-v2-on-lake" : "border-v2-lake bg-transparent text-v2-lake"}`}
                  >
                    {speech.transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : speech.recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="AI 解析"
                  disabled={!canParse || busy}
                  onClick={onParse}
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-v2-lake text-v2-on-lake shadow-[0_4px_10px_rgba(27,88,71,.3)] disabled:bg-v2-line disabled:text-v2-ink-subtle disabled:shadow-none"
                >
                  <SendHorizontal className="h-[17px] w-[17px]" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div className="mx-4 mt-3 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => append(ex)} className="flex-shrink-0 rounded-full bg-v2-sand px-3 py-1.5 text-xs font-semibold text-v2-ink-muted">
                {ex}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className={`${SECTION_CARD} mt-4`}>
          <p className="mb-1 text-[13px] font-bold text-v2-lake">收據/消費圖片</p>
          <p className="mb-3 text-xs text-v2-ink-subtle">{image ? "只會辨識這張圖片，忽略文字" : "AI 自動辨識金額與品項"}</p>
          {image ? (
            <div className="relative overflow-hidden rounded-[14px] border border-v2-line bg-v2-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="圖片預覽" className="max-h-48 w-full object-contain" />
              <button
                type="button"
                aria-label="移除圖片"
                onClick={onImageRemove}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-v2-ink/60 text-v2-paper"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
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
          )}
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              aria-label="AI 解析"
              disabled={!canParse || busy}
              onClick={onParse}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-v2-lake text-v2-on-lake shadow-[0_4px_10px_rgba(27,88,71,.3)] disabled:bg-v2-line disabled:text-v2-ink-subtle disabled:shadow-none"
            >
              <SendHorizontal className="h-[17px] w-[17px]" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {shownError && (
        <div className="mt-auto border-t border-v2-line bg-v2-surface px-4 py-3.5">
          <p role="alert" className="text-xs font-bold text-v2-danger">
            {shownError}
          </p>
        </div>
      )}
    </div>
  )
}
