"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { ImageIcon, X, ChevronLeft, ChevronRight, ExternalLink, Calendar, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/constants/currencies"
import { CATEGORIES, CATEGORY_COLORS, type ExpenseCategory } from "@/lib/constants/expenses"

interface ExpensePayer {
  id: string
  memberId: string
  amount: number
  member: {
    id: string
    displayName: string
  }
}

interface Expense {
  id: string
  amount: number
  currency: string
  description: string | null
  category: string | null
  image: string | null
  location: string | null
  expenseDate: string
  payers: ExpensePayer[]
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

export function PhotosV1({ projectId }: { projectId: string }) {
  const router = useRouter()
  const authFetch = useAuthFetch()

  const [project, setProject] = useState<Project | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const backHref = `/projects/${projectId}`

  // 獲取專案和消費資料
  useEffect(() => {
    async function fetchData() {
      try {
        const [projectRes, expensesRes] = await Promise.all([
          authFetch(`/api/projects/${projectId}`),
          authFetch(`/api/projects/${projectId}/expenses`),
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
  }, [authFetch, projectId])

  // 篩選有圖片的消費
  const expensesWithPhotos = useMemo(() => {
    return expenses.filter(e => e.image)
  }, [expenses])

  // 依分類篩選
  const filteredExpenses = useMemo(() => {
    if (!selectedCategory) return expensesWithPhotos
    return expensesWithPhotos.filter(e => e.category === selectedCategory)
  }, [expensesWithPhotos, selectedCategory])

  // 統計各分類數量
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {}
    expensesWithPhotos.forEach(e => {
      const cat = e.category || "other"
      stats[cat] = (stats[cat] || 0) + 1
    })
    return stats
  }, [expensesWithPhotos])

  // 上一張/下一張
  function goToPrev() {
    if (selectedIndex === null) return
    setSelectedIndex(selectedIndex === 0 ? filteredExpenses.length - 1 : selectedIndex - 1)
  }

  function goToNext() {
    if (selectedIndex === null) return
    setSelectedIndex(selectedIndex === filteredExpenses.length - 1 ? 0 : selectedIndex + 1)
  }

  // 鍵盤導航
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (selectedIndex === null) return
      if (e.key === "ArrowLeft") goToPrev()
      if (e.key === "ArrowRight") goToNext()
      if (e.key === "Escape") setSelectedIndex(null)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  })

  const selectedExpense = selectedIndex !== null ? filteredExpenses[selectedIndex] : null

  if (loading) {
    return (
      <AppLayout title="照片牆" showBack backHref={backHref}>
        <div className="py-8 text-center text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="照片牆" showBack backHref={backHref}>
      <div className="space-y-4 pb-20">
        {/* 統計資訊 */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          <span>{expensesWithPhotos.length} 張收據照片</span>
        </div>

        {/* 分類篩選 */}
        {expensesWithPhotos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                !selectedCategory
                  ? "bg-primary text-primary-foreground"
                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              全部 ({expensesWithPhotos.length})
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
        )}

        {/* 無照片提示 */}
        {expensesWithPhotos.length === 0 && (
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-800">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">還沒有照片</h3>
            <p className="text-sm text-muted-foreground mb-4">
              記帳時上傳收據照片，<br />就能在這裡瀏覽所有照片
            </p>
            <Button variant="outline" onClick={() => router.push(`/projects/${projectId}/expenses/new`)}>
              新增消費
            </Button>
          </div>
        )}

        {/* 照片牆 Grid */}
        {filteredExpenses.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filteredExpenses.map((expense, index) => {
              const category = (expense.category || "other") as ExpenseCategory
              const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other
              const emoji = categoryEmojis[category] || categoryEmojis.other
              return (
                <button
                  key={expense.id}
                  onClick={() => setSelectedIndex(index)}
                  className="relative aspect-square rounded-xl overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {/* 圖片 */}
                  <Image
                    src={expense.image!}
                    alt={expense.description || "收據照片"}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  />

                  {/* 漸層遮罩 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* 分類標籤 */}
                  <div
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: color }}
                  >
                    {emoji}
                  </div>

                  {/* 金額（hover 顯示） */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="font-bold text-sm">
                      {formatCurrency(expense.amount, expense.currency)}
                    </div>
                    <div className="text-xs opacity-80 truncate">
                      {expense.description || "無描述"}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* 篩選後無結果 */}
        {expensesWithPhotos.length > 0 && filteredExpenses.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            此分類沒有照片
          </div>
        )}
      </div>

      {/* 燈箱 Lightbox */}
      {selectedExpense && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setSelectedIndex(null)}
        >
          {/* 關閉按鈕 */}
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>

          {/* 上一張 */}
          <button
            onClick={(e) => { e.stopPropagation(); goToPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>

          {/* 下一張 */}
          <button
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white transition-colors"
          >
            <ChevronRight className="h-8 w-8" />
          </button>

          {/* 圖片 */}
          <div
            className="relative max-w-4xl max-h-[70vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selectedExpense.image!}
              alt={selectedExpense.description || "收據照片"}
              width={800}
              height={600}
              className="object-contain w-full h-auto max-h-[70vh] rounded-lg"
            />
          </div>

          {/* 資訊列 */}
          <div
            className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-4xl mx-auto flex items-end justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: CATEGORY_COLORS[(selectedExpense.category || "other") as ExpenseCategory] }}
                  >
                    {categoryEmojis[selectedExpense.category || "other"]} {CATEGORIES.find(c => c.value === selectedExpense.category)?.label || "其他"}
                  </span>
                  <span className="text-xl font-bold">
                    {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                  </span>
                </div>
                <div className="text-sm opacity-80 mb-1">
                  {selectedExpense.description || "無描述"}
                </div>
                <div className="flex items-center gap-3 text-xs opacity-60">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(selectedExpense.expenseDate).toLocaleDateString("zh-TW")}
                  </span>
                  <span>👤 {selectedExpense.payers.map((p) => p.member.displayName).join("、") || "未知"}</span>
                  {selectedExpense.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedExpense.location.length > 20
                        ? selectedExpense.location.slice(0, 20) + "..."
                        : selectedExpense.location}
                    </span>
                  )}
                </div>
              </div>

              {/* 編輯按鈕 */}
              <Button
                variant="outline"
                size="sm"
                className="text-white border-white/30 hover:bg-white/10"
                onClick={() => router.push(`/projects/${projectId}/expenses/${selectedExpense.id}/edit`)}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                查看
              </Button>
            </div>

            {/* 圖片計數 */}
            <div className="text-center text-white/60 text-xs mt-3">
              {selectedIndex! + 1} / {filteredExpenses.length}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
