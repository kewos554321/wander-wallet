"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { fromParsed, validateItems, type QuickItem } from "@/lib/quick-expense/draft"
import { parseReceipt, parseText, receiptToItem } from "@/lib/quick-expense/parse"
import { useQuickSave } from "@/lib/quick-expense/use-quick-save"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { CameraStep } from "./camera-step"
import { ConfirmStep } from "./confirm-step"
import { QuickInputStep } from "./quick-input-step"

type Step = "input" | "camera" | "parsing" | "confirm" | "saving"
type Member = { id: string; displayName: string }

export function QuickExpenseV2({ open, onOpenChange, projectId, projectName, members, currentUserMemberId, onSuccess, currency = DEFAULT_CURRENCY }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  members: Member[]
  currentUserMemberId: string
  onSuccess: () => void
  currency?: string
}) {
  const authFetch = useAuthFetch()
  const plainMembers = members.map((m) => ({ id: m.id, displayName: m.displayName }))
  const { save, progress, canNotifyLine } = useQuickSave({ projectId, projectName, members: plainMembers })
  const [step, setStep] = useState<Step>("input")
  const [text, setText] = useState("")
  const [items, setItems] = useState<QuickItem[]>([])
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Reset everything when the overlay closes.
  useEffect(() => {
    if (open) return
    setStep("input")
    setText("")
    setItems([])
    setIndex(0)
    setError(null)
  }, [open])

  if (!open) return null
  const close = () => onOpenChange(false)

  const showItems = (next: QuickItem[]) => {
    if (next.length === 0) throw new Error("沒有辨識到支出，請換個說法再試一次")
    setItems(next)
    setIndex(0)
    setError(null)
    setStep("confirm")
  }

  const handleParse = async () => {
    setStep("parsing")
    setError(null)
    try {
      const results = await parseText(authFetch, { transcript: text.trim(), members: plainMembers, currentUserMemberId, defaultCurrency: currency })
      showItems(fromParsed(results))
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析失敗，請重試")
      setStep("input")
    }
  }

  const handleImage = async (file: File) => {
    setStep("parsing")
    setError(null)
    try {
      const result = await parseReceipt(authFetch, file)
      showItems([
        receiptToItem(result, { currency, payerId: currentUserMemberId, memberIds: plainMembers.map((m) => m.id), file, preview: URL.createObjectURL(file) }),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : "收據辨識失敗")
      setStep("input")
    }
  }

  const handleItemsChange = (next: QuickItem[]) => {
    if (next.length === 0) {
      setItems([])
      setError(null)
      setStep("input")
      return
    }
    setItems(next)
  }

  const handleSubmit = async (notifyLine: boolean) => {
    const invalid = validateItems(items)
    if (invalid) {
      setIndex(invalid.index)
      setError(invalid.message)
      return
    }
    setStep("saving")
    setError(null)
    const { savedIds, failed } = await save(items, { notifyLine })
    if (savedIds.length > 0) onSuccess()
    if (!failed) {
      close()
      return
    }
    const remaining = items.filter((i) => !savedIds.includes(i.id))
    setItems(remaining)
    // Saving is sequential, so the failed item is the first unsaved one.
    setIndex(0)
    setError(failed.message)
    setStep("confirm")
  }

  return (
    <UiV2Scope className="fixed inset-0 z-50 overflow-y-auto bg-v2-paper">
      <div className="mx-auto min-h-full max-w-md">
        {step === "input" && (
          <QuickInputStep text={text} onTextChange={setText} onParse={handleParse} onCamera={() => { setError(null); setStep("camera") }} onClose={close} error={error} />
        )}
        {step === "camera" && <CameraStep onImage={handleImage} onManual={() => setStep("input")} onClose={close} />}
        {(step === "parsing" || step === "saving") && (
          <div role="status" className="flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-v2-ink-muted">
            <Loader2 className="h-8 w-8 animate-spin text-v2-lake" aria-hidden="true" />
            {step === "parsing" ? "AI 解析中…" : progress ? `正在新增 ${progress.current} / ${progress.total}` : "正在新增…"}
          </div>
        )}
        {step === "confirm" && (
          <ConfirmStep
            items={items}
            members={plainMembers}
            index={Math.min(index, items.length - 1)}
            onIndexChange={setIndex}
            onItemsChange={handleItemsChange}
            onReinput={() => { setItems([]); setError(null); setStep("input") }}
            onSubmit={handleSubmit}
            onClose={close}
            canNotifyLine={canNotifyLine}
            error={error}
          />
        )}
      </div>
    </UiV2Scope>
  )
}
