import Link from "next/link"
import { Plus, Sparkles } from "lucide-react"

const pill =
  "rounded-full border border-v2-line bg-v2-surface px-2.5 py-1.5 text-xs font-medium leading-4 tracking-[.5px] text-v2-ink shadow-[0_2px_6px_rgba(27,24,21,.08)]"

export function QuickActions({ projectId, onVoice }: { projectId: string; onVoice: () => void }) {
  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-3">
      <button type="button" onClick={onVoice} className="flex items-center gap-2">
        <span className={pill}>AI 快速記帳</span>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-v2-coral text-v2-on-lake shadow-[0_4px_10px_rgba(232,130,90,.35)]">
          <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.7} />
        </span>
      </button>
      <Link
        href={`/projects/${projectId}/expenses/new`}
        aria-label="手動新增支出"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-v2-lake text-v2-on-lake shadow-[0_6px_16px_rgba(27,88,71,.4)]"
      >
        <Plus className="h-[22px] w-[22px]" strokeWidth={2.2} />
      </Link>
    </div>
  )
}
