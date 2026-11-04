import Link from "next/link"
import { Plus, Sparkles } from "lucide-react"

const pill =
  "rounded-full border border-v2-line bg-v2-surface px-2.5 py-1.5 text-xs font-medium leading-4 tracking-[.5px] text-v2-ink shadow-v2-sm"

export function QuickActions({ projectId, onVoice }: { projectId: string; onVoice: () => void }) {
  return (
    <div
      data-tour="add-expense-area"
      className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 z-50 flex flex-col items-end gap-3"
    >
      <button
        type="button"
        onClick={onVoice}
        className="flex items-center gap-2 rounded-full transition-transform duration-150 ease-out active:scale-[.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-coral motion-reduce:transition-none"
      >
        <span className={pill}>AI 快速記帳</span>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-v2-coral text-v2-on-lake shadow-v2-coral">
          <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.7} />
        </span>
      </button>
      <Link
        href={`/projects/${projectId}/expenses/new`}
        aria-label="手動新增支出"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-v2-lake text-v2-on-lake shadow-v2-lake-strong transition-transform duration-150 ease-out hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
      >
        <Plus className="h-[22px] w-[22px]" strokeWidth={2.2} />
      </Link>
    </div>
  )
}
