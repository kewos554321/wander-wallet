"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, Check, Link2, MessageCircle, MoreHorizontal, X } from "lucide-react"
import { Sheet } from "@/components/v2/ui/sheet"
import { getProjectShareUrl } from "@/lib/utils"

interface InviteSheetV2Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
}

/** Copy that also works in LIFF webviews without the async clipboard API. */
function legacyCopy(text: string) {
  const field = document.createElement("textarea")
  field.value = text
  field.setAttribute("readonly", "")
  field.style.position = "fixed"
  field.style.opacity = "0"
  document.body.appendChild(field)
  field.select()
  const ok = document.execCommand("copy")
  document.body.removeChild(field)
  if (!ok) throw new Error("copy failed")
}

export function InviteSheetV2({ open, onOpenChange, projectId, projectName }: InviteSheetV2Props) {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)
  const resetTimer = useRef<number | null>(null)
  const shareUrl = getProjectShareUrl(projectId)

  // Detect after mount so the server and first client render agree.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share)
  }, [])

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
    }
  }, [])

  function flashCopied() {
    setCopied(true)
    setCopyFailed(false)
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
    resetTimer.current = window.setTimeout(() => setCopied(false), 2200)
  }

  async function handleCopyLink() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        legacyCopy(shareUrl)
      }
      flashCopied()
    } catch {
      try {
        legacyCopy(shareUrl)
        flashCopied()
      } catch {
        setCopied(false)
        setCopyFailed(true)
      }
    }
  }

  function handleShareToLine() {
    const text = `一起來分帳吧！加入「${projectName}」\n${shareUrl}`
    window.open(`https://line.me/R/share?text=${encodeURIComponent(text)}`, "_blank")
  }

  async function handleNativeShare() {
    if (!navigator.share) {
      void handleCopyLink()
      return
    }
    try {
      await navigator.share({ title: `加入「${projectName}」`, text: "點擊連結加入旅行旅程", url: shareUrl })
    } catch {
      // Sheet dismissed; nothing to recover.
    }
  }

  return (
    <Sheet open={open} onClose={() => onOpenChange(false)} label="邀請旅伴">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 font-v2-serif text-[19px] font-bold leading-7 text-v2-ink">邀請旅伴</h2>
          <p className="m-0 mt-1 text-[12.5px] leading-5 text-v2-ink-muted">
            把連結傳到 LINE 群組，朋友點開就能加入「{projectName}」。
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="關閉"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-v2-ink-muted transition-colors duration-150 hover:bg-v2-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
        >
          <X className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 rounded-v2-sm border border-v2-line bg-v2-paper px-3 py-2.5">
        <p className="m-0 text-[11px] font-medium text-v2-ink-muted">分享連結</p>
        <p className="m-0 mt-0.5 break-all text-[12px] leading-5 text-v2-ink">{shareUrl}</p>
      </div>

      <button
        type="button"
        onClick={handleShareToLine}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-v2-sm bg-v2-lake px-4 text-[14px] font-bold text-v2-on-lake transition-transform duration-150 ease-out hover:shadow-v2-lake-md active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
      >
        <MessageCircle className="h-[18px] w-[18px]" strokeWidth={2} />
        用 LINE 傳送邀請
      </button>

      <button
        type="button"
        onClick={handleCopyLink}
        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-v2-sm border border-v2-line bg-v2-surface px-4 text-[13px] font-bold text-v2-ink transition-colors duration-150 hover:bg-v2-sand active:bg-v2-line-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
      >
        {copied ? (
          <Check className="h-4 w-4 text-v2-lake-mid" strokeWidth={2.4} />
        ) : (
          <Link2 className="h-4 w-4" strokeWidth={2} />
        )}
        {copied ? "已複製連結" : "複製連結"}
      </button>

      {canNativeShare && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 text-[12.5px] font-semibold text-v2-link transition-colors duration-150 hover:text-v2-lake focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={2.2} />
          更多分享方式
        </button>
      )}

      <p
        aria-live="polite"
        className={`m-0 mt-2 text-center text-[11.5px] leading-4 ${
          copyFailed ? "text-v2-danger" : "text-v2-ink-subtle"
        }`}
      >
        {copyFailed ? (
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" strokeWidth={2.2} />
            無法自動複製，請長按上方連結手動複製
          </span>
        ) : (
          "朋友點開連結即可加入這趟旅程"
        )}
      </p>
    </Sheet>
  )
}
