"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { List, MapPin } from "lucide-react"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { CategoryChips, type CategoryChipItem } from "@/components/v2/ui/category-chips"
import { CATEGORY_EMOJI, CATEGORY_TONES, categoryKey } from "@/components/v2/category-style"
import { getCategoryLabel, type ExpenseCategory } from "@/lib/constants/expenses"
import { formatCurrency } from "@/lib/constants/currencies"
import { cn } from "@/lib/utils"
import type { MapStyle } from "@/components/map/expense-map"

const ExpenseMap = dynamic(() => import("@/components/map/expense-map").then((m) => m.ExpenseMap), {
  ssr: false,
  loading: () => <div data-testid="map-loading" className="h-full w-full animate-pulse bg-v2-sand" />,
})

const STYLE_OPTIONS: { key: MapStyle; name: string; emoji: string }[] = [
  { key: "standard", name: "標準", emoji: "🗺️" },
  { key: "watercolor", name: "衛星圖", emoji: "🛰️" },
  { key: "voyager", name: "繽紛風", emoji: "🌈" },
  { key: "toner", name: "極簡風", emoji: "✏️" },
]

export interface MapExpense {
  id: string
  amount: number
  currency: string
  description: string | null
  category: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  expenseDate: string
  payer: { displayName: string }
}

export interface MapV2ViewProps {
  projectId: string
  projectCurrency: string
  expenses: MapExpense[]
  loading: boolean
}

export function MapV2View({ projectId, projectCurrency, expenses, loading }: MapV2ViewProps) {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showList, setShowList] = useState(false)
  const [mapStyle, setMapStyle] = useState<MapStyle>("standard")
  const [showStylePicker, setShowStylePicker] = useState(false)

  const withLocation = useMemo(
    () => expenses.filter((e) => e.latitude !== null && e.longitude !== null),
    [expenses]
  )
  const filtered = useMemo(
    () => (selectedCategory ? withLocation.filter((e) => categoryKey(e.category) === selectedCategory) : withLocation),
    [withLocation, selectedCategory]
  )
  const chipItems = useMemo<CategoryChipItem[]>(() => {
    const counts = new Map<ExpenseCategory, number>()
    for (const e of withLocation) {
      const key = categoryKey(e.category)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()].map(([key, count]) => ({ key, label: getCategoryLabel(key), emoji: CATEGORY_EMOJI[key], count }))
  }, [withLocation])

  return (
    <div className="min-h-screen">
      <V2TopBar title="消費地圖" backHref={`/projects/${projectId}`} titleClassName="text-[17px] font-semibold" />

      {loading ? (
        <div data-testid="v2-map-skeleton" className="mx-4 mt-3.5 h-[400px] animate-pulse rounded-[18px] bg-v2-sand" />
      ) : withLocation.length === 0 ? (
        <div className="mx-4 mt-10 flex flex-col items-center gap-3 text-center">
          <MapPin className="h-8 w-8 text-v2-ink-subtle" />
          <p className="text-[13px] text-v2-ink-muted">尚無位置資訊</p>
          <p className="text-[12px] text-v2-ink-subtle">
            記帳時開啟定位或手動選擇位置，
            <br />
            就能在地圖上顯示消費地點
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 pt-3">
            <div className="flex items-center gap-1.5 text-[12px] text-v2-ink-muted">
              <MapPin className="h-[13px] w-[13px] text-v2-lake" />
              <span>{withLocation.length} 筆消費有位置資訊</span>
            </div>
            <button
              type="button"
              onClick={() => setShowList((v) => !v)}
              className="flex items-center gap-1.5 rounded-[8px] border border-v2-lake-edge bg-v2-lake-soft px-2.5 py-1.5 text-[12px] font-semibold text-v2-lake"
            >
              <List className="h-[13px] w-[13px]" />
              {showList ? "隱藏列表" : "顯示列表"}
            </button>
          </div>

          <div className="pt-2.5">
            <CategoryChips items={chipItems} totalCount={withLocation.length} selected={selectedCategory} onSelect={setSelectedCategory} />
          </div>

          <div className="relative mx-4 mt-3 h-[400px] overflow-hidden rounded-[18px] border border-v2-line bg-v2-lake-soft">
            <ExpenseMap
              expenses={filtered.map((e) => ({ ...e, latitude: e.latitude as number, longitude: e.longitude as number, currency: e.currency || projectCurrency }))}
              projectCurrency={projectCurrency}
              mapStyle={mapStyle}
              onExpenseClick={(id) => router.push(`/projects/${projectId}/expenses/${id}/edit`)}
            />
            <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-[10px] border border-v2-line bg-v2-surface px-2.5 py-1.5 text-[11px] font-semibold text-v2-lake shadow-[0_2px_6px_rgba(27,24,21,.08)]">
              篩選中：{selectedCategory ? getCategoryLabel(selectedCategory) : "全部"}
            </div>
            <button
              type="button"
              data-testid="map-style-toggle"
              aria-label="地圖樣式"
              onClick={() => setShowStylePicker((v) => !v)}
              className="absolute right-2.5 top-2.5 rounded-[10px] border border-v2-line bg-v2-surface px-2 py-1.5 text-[14px] shadow-[0_2px_6px_rgba(27,24,21,.08)]"
            >
              {STYLE_OPTIONS.find((s) => s.key === mapStyle)?.emoji}
            </button>
            {showStylePicker ? (
              <div className="absolute right-2.5 top-[54px] z-10 flex flex-col gap-0.5 rounded-[10px] border border-v2-line bg-v2-surface p-1 shadow-[0_10px_28px_rgba(27,24,21,.18)]">
                {STYLE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    data-testid={`map-style-option-${option.key}`}
                    onClick={() => {
                      setMapStyle(option.key)
                      setShowStylePicker(false)
                    }}
                    className="whitespace-nowrap rounded-[7px] px-2.5 py-1.5 text-left text-[12px]"
                  >
                    {option.emoji} {option.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {showList ? (
            <div className="flex flex-col gap-2.5 px-4 pt-3.5">
              {filtered.map((expense) => {
                const key = categoryKey(expense.category)
                return (
                  <button
                    key={expense.id}
                    type="button"
                    onClick={() => router.push(`/projects/${projectId}/expenses/${expense.id}/edit`)}
                    className="flex items-center gap-3 rounded-[12px] border border-v2-line bg-v2-surface px-3 py-2.5 text-left"
                  >
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[17px]", CATEGORY_TONES[key])}>{CATEGORY_EMOJI[key]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px]">{expense.description || "無描述"}</span>
                      <span className="block text-[12px] text-v2-ink-muted">
                        {expense.payer.displayName}付款{expense.location ? ` · ${expense.location}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-[14px] font-bold">{formatCurrency(expense.amount, expense.currency || projectCurrency)}</span>
                  </button>
                )
              })}
            </div>
          ) : null}

          {expenses.length > withLocation.length ? (
            <p className="px-4 py-4 text-center text-[12px] text-v2-ink-subtle">還有 {expenses.length - withLocation.length} 筆消費沒有位置資訊</p>
          ) : null}
        </>
      )}
    </div>
  )
}
