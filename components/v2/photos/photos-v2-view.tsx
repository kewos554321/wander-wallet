"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, ImageIcon, X } from "lucide-react"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { CategoryChips, type CategoryChipItem } from "@/components/v2/ui/category-chips"
import { CATEGORY_EMOJI, CATEGORY_TONES, categoryKey } from "@/components/v2/category-style"
import { getCategoryLabel, type ExpenseCategory } from "@/lib/constants/expenses"
import { formatCurrency } from "@/lib/constants/currencies"
import { cn } from "@/lib/utils"

export interface PhotoExpense {
  id: string
  image: string | null
  amount: number
  currency: string
  description: string | null
  category: string | null
  location: string | null
  expenseDate: string
  payer: { id: string; displayName: string }
}

export interface PhotosV2ViewProps {
  projectId: string
  currency: string
  expenses: PhotoExpense[]
  loading: boolean
}

export function PhotosV2View({ projectId, currency, expenses, loading }: PhotosV2ViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const withPhotos = useMemo(() => expenses.filter((e) => e.image), [expenses])
  const filtered = useMemo(
    () => (selectedCategory ? withPhotos.filter((e) => categoryKey(e.category) === selectedCategory) : withPhotos),
    [withPhotos, selectedCategory]
  )

  const chipItems = useMemo<CategoryChipItem[]>(() => {
    const counts = new Map<ExpenseCategory, number>()
    for (const e of withPhotos) {
      const key = categoryKey(e.category)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()].map(([key, count]) => ({
      key,
      label: getCategoryLabel(key),
      emoji: CATEGORY_EMOJI[key],
      count,
    }))
  }, [withPhotos])

  const selected = selectedIndex !== null && selectedIndex < filtered.length ? filtered[selectedIndex] : null

  const close = () => setSelectedIndex(null)
  const goPrev = () => setSelectedIndex((i) => (i === null || filtered.length === 0 ? i : (i - 1 + filtered.length) % filtered.length))
  const goNext = () => setSelectedIndex((i) => (i === null || filtered.length === 0 ? i : (i + 1) % filtered.length))

  useEffect(() => {
    if (selectedIndex === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
      else if (event.key === "ArrowLeft") goPrev()
      else if (event.key === "ArrowRight") goNext()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  return (
    <div className="min-h-screen">
      <V2TopBar title="照片牆" backHref={`/projects/${projectId}`} titleClassName="text-[17px] font-semibold" />

      {loading ? (
        <div data-testid="v2-photos-skeleton" className="mx-4 mt-3.5 h-64 animate-pulse rounded-2xl bg-v2-sand" />
      ) : withPhotos.length === 0 ? (
        <div className="mx-4 mt-10 flex flex-col items-center gap-3 text-center">
          <ImageIcon className="h-8 w-8 text-v2-ink-subtle" />
          <p className="text-[13px] text-v2-ink-muted">還沒有照片</p>
          <p className="text-[12px] text-v2-ink-subtle">
            記帳時上傳收據照片，
            <br />
            就能在這裡瀏覽所有照片
          </p>
          <Link href={`/projects/${projectId}/expenses/new`} className="text-[13px] font-semibold text-v2-lake">
            新增消費
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 px-4 pt-3 text-[12px] text-v2-ink-muted">
            <ImageIcon className="h-[13px] w-[13px] text-v2-lake" />
            <span>{withPhotos.length} 張收據照片</span>
          </div>
          <div className="pt-2.5">
            <CategoryChips
              items={chipItems}
              totalCount={withPhotos.length}
              selected={selectedCategory}
              onSelect={(key) => {
                setSelectedCategory(key)
                setSelectedIndex(null)
              }}
            />
          </div>
          {filtered.length === 0 ? (
            <p className="mx-4 mt-10 text-center text-[13px] text-v2-ink-muted">此分類沒有照片</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 px-4 pt-3 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((expense, index) => {
                const key = categoryKey(expense.category)
                return (
                  <button
                    key={expense.id}
                    type="button"
                    data-testid={`photo-tile-${expense.id}`}
                    onClick={() => setSelectedIndex(index)}
                    className="relative aspect-square overflow-hidden rounded-[14px]"
                  >
                    <Image src={expense.image!} alt={expense.description || "收據照片"} fill sizes="(max-width:640px) 50vw, 33vw" className="object-cover" />
                    <span className={cn("absolute left-[7px] top-[7px] rounded-full bg-v2-surface px-2 py-[3px] text-[10px] font-semibold", CATEGORY_TONES[key])}>
                      {CATEGORY_EMOJI[key]} {getCategoryLabel(key)}
                    </span>
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-v2-ink/75 to-transparent p-[9px] text-left text-v2-paper">
                      <span className="block font-v2-serif text-[13px] font-bold">{formatCurrency(expense.amount, expense.currency || currency)}</span>
                      <span className="block truncate text-[10px]">{expense.description || "無描述"}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {selected ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="照片檢視"
          data-testid="photo-lightbox"
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-v2-lightbox"
        >
          <button type="button" aria-label="關閉" onClick={close} className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-v2-paper/15 text-v2-paper">
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="上一張"
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-v2-paper/15 text-v2-paper"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="下一張"
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-v2-paper/15 text-v2-paper"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="w-full max-w-4xl px-4" onClick={(e) => e.stopPropagation()}>
            <Image src={selected.image!} alt={selected.description || "收據照片"} width={800} height={600} className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain" />
            <div className="mt-3 flex flex-col gap-1 text-v2-paper">
              <span className={cn("w-fit rounded-full bg-v2-paper/15 px-2 py-0.5 text-[10px] font-semibold", CATEGORY_TONES[categoryKey(selected.category)])}>
                {CATEGORY_EMOJI[categoryKey(selected.category)]} {getCategoryLabel(categoryKey(selected.category))}
              </span>
              <span className="font-v2-serif text-[15px] font-bold">{formatCurrency(selected.amount, selected.currency || currency)}</span>
              <span className="text-[13px]">{selected.description || "無描述"}</span>
              <span className="text-[12px] opacity-80">
                {new Date(selected.expenseDate).toLocaleDateString("zh-TW")} · 👤 {selected.payer.displayName}
                {selected.location ? ` · 📍 ${selected.location}` : ""}
              </span>
              <div className="mt-1 flex items-center justify-between">
                <Link href={`/projects/${projectId}/expenses/${selected.id}/edit`} className="text-[13px] font-semibold text-v2-paper underline">
                  查看
                </Link>
                <span data-testid="photo-counter" className="text-[12px] opacity-80">
                  {selectedIndex! + 1} / {filtered.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
