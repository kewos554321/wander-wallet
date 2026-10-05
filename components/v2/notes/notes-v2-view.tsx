"use client"

import { Lightbulb, Save } from "lucide-react"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"

export interface NotesV2ViewProps {
  projectId: string
  memo: string
  onMemo: (value: string) => void
  loading: boolean
  saving: boolean
  saved: boolean
  hasChanges: boolean
  onSave: () => void
}

const PLACEHOLDER = `在這裡輸入筆記內容...

例如：
- 航班：CI-123 10:00 起飛
- 飯店：XXX Hotel
- WiFi 密碼：abc123`

export function NotesV2View({
  projectId,
  memo,
  onMemo,
  loading,
  saving,
  saved,
  hasChanges,
  onSave,
}: NotesV2ViewProps) {
  return (
    <div className="flex min-h-screen flex-col pb-24">
      <V2TopBar title="筆記" backHref={`/projects/${projectId}`} titleClassName="text-[17px] font-semibold" />
      {loading ? (
        <div data-testid="v2-notes-skeleton" className="mx-4 mt-3.5 h-64 animate-pulse rounded-2xl bg-v2-sand" />
      ) : (
        <>
          <div className="mx-4 mt-3.5 flex items-center gap-2 rounded-[12px] border border-v2-lake-border bg-v2-lake-soft px-3.5 py-2.5">
            <Lightbulb className="h-[15px] w-[15px] shrink-0 text-v2-lake" />
            <span className="text-[12px] text-v2-lake">所有成員共享的筆記，可記錄行程、重要資訊等</span>
          </div>
          <div className="mx-4 mt-3 flex min-h-[320px] flex-1 rounded-2xl border border-v2-line bg-v2-surface p-4">
            <textarea
              value={memo}
              onChange={(e) => onMemo(e.target.value)}
              placeholder={PLACEHOLDER}
              className="h-full w-full resize-none bg-transparent text-[15px] leading-[1.7] text-v2-ink outline-none placeholder:text-v2-ink-subtle"
            />
          </div>
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-v2-line bg-v2-surface px-4 py-3.5">
            <div className="mx-auto max-w-md">
              <button
                type="button"
                onClick={onSave}
                disabled={!hasChanges || saving}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-v2-lake text-[15px] font-bold text-v2-paper disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saved ? "已儲存" : saving ? "儲存中..." : "儲存變更"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
