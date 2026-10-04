"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { Check, Copy, X } from "lucide-react"
import { useDismiss } from "@/components/v2/use-dismiss"

interface SettleShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shareText: string
  trigger?: ReactNode
}

// "分享結算結果" dialog, ported from the shared v1 dialog so it can be rendered
// inline inside the UiV2Scope tree (v2 tokens resolve; no shadcn Portal).
export function SettleShareDialog({ open, onOpenChange, shareText }: SettleShareDialogProps) {
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useDismiss(cardRef, () => onOpenChange(false), open)

  useEffect(() => {
    if (open) cardRef.current?.focus()
  }, [open])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("複製失敗:", err)
    }
  }

  // Share to LINE via the official URL scheme.
  function handleShareLINE() {
    window.open(`https://line.me/R/share?text=${encodeURIComponent(shareText)}`, "_blank")
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div
      data-testid="settle-share-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-v2-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false)
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-[340px] max-w-[calc(100vw-40px)] rounded-[20px] bg-v2-surface p-[22px] outline-none"
      >
        <button
          type="button"
          aria-label="關閉"
          onClick={() => onOpenChange(false)}
          className="absolute right-[14px] top-[14px] flex h-6 w-6 items-center justify-center rounded-full text-v2-ink-subtle hover:text-v2-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <h2 id={titleId} className="mb-4 mt-0 font-v2-serif text-[17px] font-bold">
          分享結算結果
        </h2>

        <div
          data-testid="settle-share-preview"
          className="mb-[18px] max-h-[150px] overflow-y-auto whitespace-pre-line rounded-[12px] border border-v2-lake-border bg-v2-lake-soft p-[13px] text-[13px] leading-[1.7] text-v2-ink"
        >
          {shareText}
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-v2-line bg-v2-surface text-[13px] font-semibold ${
              copied ? "text-v2-lake" : "text-v2-ink-muted"
            }`}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-v2-lake" aria-hidden="true" />
                已複製
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                複製文字
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleShareLINE}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-v2-line-green text-[13px] font-bold text-v2-on-lake"
          >
            <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            LINE 分享
          </button>
        </div>
      </div>
    </div>
  )
}
