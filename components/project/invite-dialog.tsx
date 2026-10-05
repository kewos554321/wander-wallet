"use client"

import { useEffect, useState } from "react"
import { Check, Link2, MessageCircle, MoreHorizontal } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getProjectShareUrl } from "@/lib/utils"

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
}

export function InviteDialog({ open, onOpenChange, projectId, projectName }: InviteDialogProps) {
  const [copied, setCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)
  const shareUrl = getProjectShareUrl(projectId)

  // Detect after mount so server and first client render agree (no hydration mismatch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share)
  }, [])

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShareToLine() {
    const text = `一起來分帳吧！加入「${projectName}」\n${shareUrl}`
    window.open(`https://line.me/R/share?text=${encodeURIComponent(text)}`, "_blank")
  }

  async function handleNativeShare() {
    if (!navigator.share) {
      handleCopyLink()
      return
    }
    try {
      await navigator.share({ title: `加入「${projectName}」`, text: "點擊連結加入旅行專案", url: shareUrl })
    } catch {
      // cancelled
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>邀請成員加入</DialogTitle>
          <DialogDescription>選擇分享方式邀請朋友加入專案</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className={`grid gap-3 ${canNativeShare ? "grid-cols-3" : "grid-cols-2"}`}>
            <button
              onClick={handleShareToLine}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-[#06C755] flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-medium">LINE</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-slate-500 flex items-center justify-center">
                {copied ? <Check className="h-6 w-6 text-white" /> : <Link2 className="h-6 w-6 text-white" />}
              </div>
              <span className="text-sm font-medium">{copied ? "已複製" : "複製連結"}</span>
            </button>

            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                  <MoreHorizontal className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-medium">更多</span>
              </button>
            )}
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">分享連結</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 break-all">{shareUrl}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
