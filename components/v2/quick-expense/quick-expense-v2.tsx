"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { resolvePreviewRate } from "@/lib/currency-conversion"
import { getCurrentLocation } from "@/lib/geolocation"
import { useCurrencyConversion } from "@/lib/hooks/useCurrencyConversion"
import { fromParsed, validateItems, type QuickItem } from "@/lib/quick-expense/draft"
import { parseReceipt, parseText, receiptToItem } from "@/lib/quick-expense/parse"
import { useQuickSave } from "@/lib/quick-expense/use-quick-save"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { CameraStep } from "./camera-step"
import { ConfirmStep } from "./confirm-step"
import { QuickInputStep, type QuickInputMode } from "./quick-input-step"

type Step = "input" | "camera" | "parsing" | "confirm" | "saving"
type Member = { id: string; displayName: string; image?: string | null }

type QuickExpenseV2Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  members: Member[]
  currentUserMemberId: string
  onSuccess: () => void
  currency?: string
  // Project custom rates, used to resolve a per-expense preview rate.
  customRates?: Record<string, number> | null
  // Which step the flow opens on; "camera" skips straight to the viewfinder.
  initialStep?: "input" | "camera"
}

// Thin shell: unmounting the flow when closed resets all its state for
// free, and any async parse/save that resolves after close becomes a
// no-op instead of writing stale state into a later reopen.
export function QuickExpenseV2(props: QuickExpenseV2Props) {
  return props.open ? <QuickExpenseFlow {...props} /> : null
}

function QuickExpenseFlow({ onOpenChange, projectId, projectName, members, currentUserMemberId, onSuccess, currency = DEFAULT_CURRENCY, customRates = null, initialStep = "input" }: QuickExpenseV2Props) {
  const authFetch = useAuthFetch()
  const plainMembers = members.map((m) => ({ id: m.id, displayName: m.displayName }))
  const { save, progress, canNotifyLine } = useQuickSave({ projectId, projectName, members: plainMembers })
  // The settlement currency is the project currency; the AI result card
  // resolves each item's preview rate against it (mirrors the expense form).
  const projectCurrency = currency
  const { exchangeRates, refetch: refetchRates } = useCurrencyConversion({ projectCurrency, customRates, autoFetch: false })
  const previewRateInfo = (c: string) => resolvePreviewRate(c, projectCurrency, customRates, exchangeRates)
  const [step, setStep] = useState<Step>(initialStep)
  const [mode, setMode] = useState<QuickInputMode>("text")
  const [text, setText] = useState("")
  const [items, setItems] = useState<QuickItem[]>([])
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notifyLine, setNotifyLine] = useState(true)
  const [inputImage, setInputImage] = useState<{ file: File; preview: string } | null>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Fetch live rates once when an item needs a conversion (mirrors the expense
  // form). The ref guard keeps a failed fetch from re-firing on every render.
  const hasForeignItems = items.some((i) => i.currency !== projectCurrency)
  const ratesFetchedRef = useRef(false)
  useEffect(() => {
    if (hasForeignItems && !exchangeRates && !ratesFetchedRef.current) {
      ratesFetchedRef.current = true
      refetchRates()
    }
  }, [hasForeignItems, exchangeRates, refetchRates])

  const close = () => {
    // Pop the dialog entry we pushed so Back doesn't need an extra press later.
    if (window.history.state?.qe === "dialog") window.history.back()
    onOpenChange(false)
  }

  const onOpenChangeRef = useRef(onOpenChange)
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  // The overlay pushes one history entry so the phone's native back closes it
  // instead of navigating away. The push is guarded by the entry marker so a
  // React StrictMode re-run does not push twice, and cleanup only detaches the
  // listener (never pops) so StrictMode's setup/cleanup/setup cycle is harmless.
  useEffect(() => {
    if (!window.history.state?.qe) {
      window.history.pushState({ ...window.history.state, qe: "dialog" }, "")
    }
    const onPop = (event: PopStateEvent) => {
      const layer = (event.state as { qe?: string } | null)?.qe
      // A pop onto the dialog/camera entry is handled by the layers below.
      if (layer === "dialog" || layer === "camera") return
      onOpenChangeRef.current(false)
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  // Let the phone's native back button leave the camera step back to the input
  // step: push a history entry while the camera is open, then pop it when we
  // leave by any other route so the stack stays balanced.
  useEffect(() => {
    if (step !== "camera") return
    let popped = false
    const onPop = (event: PopStateEvent) => {
      popped = true
      // Only return to input when we actually landed on a non-camera entry.
      if ((event.state as { qe?: string } | null)?.qe !== "camera") setStep("input")
    }
    window.history.pushState({ ...window.history.state, qe: "camera" }, "")
    window.addEventListener("popstate", onPop)
    return () => {
      window.removeEventListener("popstate", onPop)
      if (!popped) window.history.back()
    }
  }, [step])

  const showItems = (next: QuickItem[]) => {
    if (next.length === 0) throw new Error("沒有辨識到支出，請換個說法再試一次")
    setItems(next)
    setIndex(0)
    setError(null)
    setStep("confirm")
    // Silently prefill the device location on items that have none, matching the
    // create-expense form and v1's voice dialog. A failed lookup is ignored.
    getCurrentLocation().then((loc) => {
      if (!loc || !mountedRef.current) return
      setItems((prev) =>
        prev.map((item) =>
          item.location == null
            ? { ...item, location: loc.location, latitude: loc.latitude, longitude: loc.longitude }
            : item
        )
      )
    })
  }

  const attachImage = (file: File) => {
    setInputImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview)
      return { file, preview: URL.createObjectURL(file) }
    })
    setError(null)
    setMode("image")
    setStep("input")
  }

  const clearInputImage = () => {
    setInputImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview)
      return null
    })
  }

  const handleParse = async () => {
    setStep("parsing")
    setError(null)
    try {
      if (mode === "image" && inputImage) {
        // The image tab is active: analyse the receipt only.
        const result = await parseReceipt(authFetch, inputImage.file)
        showItems([
          receiptToItem(result, {
            currency,
            payerId: currentUserMemberId,
            memberIds: plainMembers.map((m) => m.id),
            file: inputImage.file,
            preview: inputImage.preview,
          }),
        ])
      } else {
        const results = await parseText(authFetch, { transcript: text.trim(), members: plainMembers, currentUserMemberId, defaultCurrency: currency })
        showItems(fromParsed(results))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : inputImage ? "收據辨識失敗" : "解析失敗，請重試")
      setStep("input")
    }
  }

  const pickGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) attachImage(file)
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

  const handleSubmit = async (shouldNotifyLine: boolean) => {
    const invalid = validateItems(items, plainMembers)
    if (invalid) {
      setIndex(invalid.index)
      setError(invalid.message)
      return
    }
    setStep("saving")
    setError(null)
    const { savedIds, failed } = await save(items, { notifyLine: shouldNotifyLine })
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
        <input ref={galleryInput} data-testid="quick-gallery-input" type="file" accept="image/*" className="hidden" onChange={pickGallery} />
        {step === "input" && (
          <QuickInputStep text={text} onTextChange={setText} onParse={handleParse} onCamera={() => { setError(null); setStep("camera") }} onGallery={() => galleryInput.current?.click()} onClose={close} error={error} image={inputImage?.preview ?? null} onImageRemove={clearInputImage} mode={mode} onModeChange={setMode} />
        )}
        {step === "camera" && <CameraStep onImage={attachImage} onClose={() => setStep("input")} />}
        {(step === "parsing" || step === "saving") && (
          <div role="status" className="flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-v2-ink-muted">
            <Loader2 className="h-8 w-8 animate-spin text-v2-lake" aria-hidden="true" />
            {step === "parsing" ? "AI 解析中…" : progress ? `正在新增 ${progress.current} / ${progress.total}` : "正在新增…"}
          </div>
        )}
        {step === "confirm" && (
          <ConfirmStep
            items={items}
            members={members}
            index={Math.min(index, items.length - 1)}
            onIndexChange={setIndex}
            onItemsChange={handleItemsChange}
            onReinput={() => { setItems([]); setError(null); setStep("input"); clearInputImage(); setMode("text") }}
            onSubmit={handleSubmit}
            onClose={close}
            canNotifyLine={canNotifyLine}
            notifyLine={notifyLine}
            onNotifyLineChange={setNotifyLine}
            error={error}
            projectCurrency={projectCurrency}
            previewRateInfo={previewRateInfo}
          />
        )}
      </div>
    </UiV2Scope>
  )
}
