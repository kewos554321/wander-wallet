"use client"

import { useState, type FormEvent } from "react"
import { X } from "lucide-react"
import { Sheet } from "@/components/v2/ui/sheet"

interface AddMemberSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (name: string) => Promise<string | null>
}

/** v2 bottom sheet for adding a placeholder companion (was a v1 centred dialog). */
export function AddMemberSheet({ open, onOpenChange, onAdd }: AddMemberSheetProps) {
  const [name, setName] = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")

  function close() {
    onOpenChange(false)
    setName("")
    setError("")
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    setError("")
    const nextError = await onAdd(name)
    setAdding(false)
    if (nextError) {
      setError(nextError)
      return
    }
    close()
  }

  return (
    <Sheet open={open} onClose={close} label="新增旅伴">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 font-v2-serif text-[19px] font-bold leading-7 text-v2-ink">新增旅伴</h2>
          <p className="m-0 mt-1 text-[12.5px] leading-5 text-v2-ink-muted">
            建立佔位旅伴，用來記錄還沒加入或不使用 App 的旅伴支出。
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="關閉"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-v2-ink-muted transition-colors duration-150 hover:bg-v2-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
        >
          <X className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <label htmlFor="add-member-name" className="text-[12px] font-bold leading-4 text-v2-ink">
          名稱
        </label>
        <input
          id="add-member-name"
          type="text"
          placeholder="例：小明（最多 15 字）"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={15}
          disabled={adding}
          className="mt-1.5 h-12 w-full rounded-v2-sm border border-v2-line bg-v2-surface px-3 text-[16px] text-v2-ink outline-none placeholder:text-v2-ink-muted focus-visible:border-v2-lake focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake disabled:bg-v2-paper"
        />
        {error && (
          <p role="alert" className="m-0 mt-1.5 text-[12px] leading-5 text-v2-danger-strong">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={close}
            disabled={adding}
            className="flex h-12 flex-1 items-center justify-center rounded-v2-sm border border-v2-line bg-v2-surface text-[14px] font-bold text-v2-ink transition-colors duration-150 hover:bg-v2-sand disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={adding || !name.trim()}
            className="flex h-12 flex-1 items-center justify-center rounded-v2-sm bg-v2-lake text-[14px] font-bold text-v2-on-lake transition-transform duration-150 ease-out hover:shadow-v2-lake-md active:scale-[.98] disabled:cursor-not-allowed disabled:bg-v2-sand disabled:text-v2-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
          >
            {adding ? "新增中…" : "新增旅伴"}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
