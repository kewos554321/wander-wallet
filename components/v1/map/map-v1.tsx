"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { MapPin, List, X, Receipt, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { CATEGORIES, CATEGORY_COLORS, type ExpenseCategory } from "@/lib/constants/expenses"
import { MAP_STYLES, type MapStyle } from "@/components/map/expense-map"

// 動態載入地圖元件（Leaflet 不支援 SSR）
const ExpenseMap = dynamic(
  () => import("@/components/map/expense-map").then(mod => mod.ExpenseMap),
  {
    loading: () => (
      <div className="w-full h-[60vh] bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse flex items-center justify-center">
        <MapPin className="h-8 w-8 text-muted-foreground animate-bounce" />
      </div>
    ),
    ssr: false,
  }
)

interface Expense {
  id: string
  amount: number
  currency: string
  description: string | null
  category: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  expenseDate: string
  payer: {
    id: string
    displayName: string
  }
}

interface Project {
  id: string
  name: string
  currency: string
}

// 分類 emoji 圖示
const categoryEmojis: Record<string, string> = {
  food: "🍽️",
  transport: "🚗",
  accommodation: "🏨",
  ticket: "🎫",
  shopping: "🛍️",
  entertainment: "🎮",
  gift: "🎁",
  other: "📍",
}

export function MapV1({ projectId }: { projectId: string }) {
  const id = projectId
  const router = useRouter()
  const authFetch = useAuthFetch()

  const [project, setProject] = useState<Project | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showList, setShowList] = useState(false)
  const [mapStyle, setMapStyle] = useState<MapStyle>("standard")
  const [showStylePicker, setShowStylePicker] = useState(false)

  const backHref = `/projects/${id}`

  // 獲取專案和消費資料
  useEffect(() => {
    async function fetchData() {
      try {
        const [projectRes, expensesRes] = await Promise.all([
          authFetch(`/api/projects/${id}`),
          authFetch(`/api/projects/${id}/expenses`),
        ])

        if (projectRes.ok) {
          const projectData = await projectRes.json()
          setProject(projectData)
        }

        if (expensesRes.ok) {
          const expensesData = await expensesRes.json()
          setExpenses(expensesData)
        }
      } catch (error) {
        console.error("獲取資料失敗:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [authFetch, id])

  // 篩選有座標的消費
  const expensesWithLocation = useMemo(() => {
    return expenses.filter(e => e.latitude && e.longitude)
  }, [expenses])

  // 依分類篩選
  const filteredExpenses = useMemo(() => {
    if (!selectedCategory) return expensesWithLocation
    return expensesWithLocation.filter(e => e.category === selectedCategory)
  }, [expensesWithLocation, selectedCategory])

  // 統計各分類數量
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {}
    expensesWithLocation.forEach(e => {
      const cat = e.category || "other"
      stats[cat] = (stats[cat] || 0) + 1
    })
    return stats
  }, [expensesWithLocation])

  // 點擊消費時導航到編輯頁
  function handleExpenseClick(expenseId: string) {
    router.push(`/projects/${id}/expenses/${expenseId}/edit`)
  }

  const projectCurrency = project?.currency || DEFAULT_CURRENCY

  if (loading) {
    return (
      <AppLayout title="消費地圖" showBack backHref={backHref}>
        <div className="py-8 text-center text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="消費地圖" showBack backHref={backHref}>
      <div className="space-y-4 pb-20">
        {/* 統計資訊 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{expensesWithLocation.length} 筆消費有位置資訊</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowList(!showList)}
            className="gap-1"
          >
            <List className="h-4 w-4" />
            {showList ? "隱藏列表" : "顯示列表"}
          </Button>
        </div>

        {/* 分類篩選 */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              !selectedCategory
                ? "bg-primary text-primary-foreground"
                : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            全部 ({expensesWithLocation.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = categoryStats[cat.value] || 0
            if (count === 0) return null
            const color = CATEGORY_COLORS[cat.value] || CATEGORY_COLORS.other
            const emoji = categoryEmojis[cat.value] || categoryEmojis.other
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                  selectedCategory === cat.value
                    ? "text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
                style={selectedCategory === cat.value ? { backgroundColor: color } : {}}
              >
                {emoji} {cat.label} ({count})
              </button>
            )
          })}
        </div>

        {/* 無位置資訊提示 */}
        {expensesWithLocation.length === 0 && (
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-800">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">尚無位置資訊</h3>
            <p className="text-sm text-muted-foreground mb-4">
              記帳時開啟定位或手動選擇位置，<br />就能在地圖上顯示消費地點
            </p>
            <Button variant="outline" onClick={() => router.push(`/projects/${id}/expenses/new`)}>
              新增消費
            </Button>
          </div>
        )}

        {/* 地圖 */}
        {filteredExpenses.length > 0 && (
          <div className="h-[60vh] relative">
            <ExpenseMap
              key={mapStyle}
              expenses={filteredExpenses.map(e => ({
                ...e,
                latitude: Number(e.latitude),
                longitude: Number(e.longitude),
              }))}
              projectCurrency={projectCurrency}
              mapStyle={mapStyle}
              onExpenseClick={handleExpenseClick}
            />

            {/* 左上角：篩選標籤 */}
            {selectedCategory && (
              <div className="absolute top-3 left-3 z-[1000]">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-full shadow-lg text-sm font-medium"
                >
                  {categoryEmojis[selectedCategory] || categoryEmojis.other}
                  {CATEGORIES.find(c => c.value === selectedCategory)?.label}
                  <X className="h-3 w-3 ml-1" />
                </button>
              </div>
            )}

            {/* 右上角：風格切換 */}
            <div className="absolute top-3 right-3 z-[1000]">
              <div className="relative">
                <button
                  onClick={() => setShowStylePicker(!showStylePicker)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-full shadow-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Palette className="h-4 w-4" />
                  {MAP_STYLES[mapStyle].emoji} {MAP_STYLES[mapStyle].name}
                </button>

                {/* 風格選擇器 */}
                {showStylePicker && (
                  <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden min-w-[140px]">
                    {(Object.keys(MAP_STYLES) as MapStyle[]).map((style) => (
                      <button
                        key={style}
                        onClick={() => {
                          setMapStyle(style)
                          setShowStylePicker(false)
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                          mapStyle === style ? "bg-primary/10 text-primary font-medium" : ""
                        }`}
                      >
                        <span className="text-lg">{MAP_STYLES[style].emoji}</span>
                        {MAP_STYLES[style].name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 消費列表 */}
        {showList && filteredExpenses.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              消費列表
            </h3>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.map((expense) => {
                const category = (expense.category || "other") as ExpenseCategory
                const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other
                const emoji = categoryEmojis[category] || categoryEmojis.other
                return (
                  <button
                    key={expense.id}
                    onClick={() => handleExpenseClick(expense.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        {emoji}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {expense.description || "無描述"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {expense.location
                            ? expense.location.length > 30
                              ? expense.location.slice(0, 30) + "..."
                              : expense.location
                            : "有座標但無地址"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">
                        {formatCurrency(expense.amount, expense.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(expense.expenseDate).toLocaleDateString("zh-TW")}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 沒有位置但有消費 */}
        {expenses.length > 0 && expensesWithLocation.length < expenses.length && (
          <div className="text-xs text-muted-foreground text-center py-2">
            還有 {expenses.length - expensesWithLocation.length} 筆消費沒有位置資訊
          </div>
        )}
      </div>
    </AppLayout>
  )
}
