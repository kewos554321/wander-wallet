"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Copy, Check } from "lucide-react"

interface ShareSettlementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shareText: string
  trigger?: ReactNode
}

export function ShareSettlementDialog({ open, onOpenChange, shareText, trigger }: ShareSettlementDialogProps) {
  const [copied, setCopied] = useState(false)

  // Copy share text to clipboard
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("複製失敗:", err)
    }
  }

  // Share to LINE via the official URL scheme
  // https://developers.line.biz/en/docs/line-login/using-line-url-scheme/
  function handleShareLINE() {
    window.open(`https://line.me/R/share?text=${encodeURIComponent(shareText)}`, "_blank")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>分享結算結果</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {/* 預覽文字 */}
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-sm whitespace-pre-line max-h-48 overflow-y-auto">
                  {shareText}
                </div>
                {/* 分享按鈕 */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        已複製
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        複製文字
                      </>
                    )}
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-[#06C755] hover:bg-[#05b34c] text-white"
                    onClick={handleShareLINE}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                    </svg>
                    LINE 分享
                  </Button>
                </div>
              </div>
            </DialogContent>
    </Dialog>
  )
}
