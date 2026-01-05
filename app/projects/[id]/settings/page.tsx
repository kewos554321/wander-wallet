"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Calendar as CalendarIcon, Loader2, Trash2 } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { CoverPicker } from "@/components/cover-picker"
import { CurrencySelect } from "@/components/ui/currency-select"
import {
  type CurrencyCode,
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  getCurrencyInfo,
} from "@/lib/constants/currencies"
import { Info } from "lucide-react"

interface Project {
  id: string
  name: string
  description: string | null
  cover: string | null
  budget: string | null
  currency: string | null
  startDate: string | null
  endDate: string | null
  joinMode: string
  customRates: Record<string, number> | null
  createdBy: string
  creator: {
    id: string
    name: string | null
    email: string
  }
  expenses?: Array<{ currency: string }>
}

const JOIN_MODE_OPTIONS = [
  { value: "both", label: "兩者皆可", description: "新成員可選擇建立新身份或取代佔位成員" },
  { value: "create_only", label: "僅建立新成員", description: "新成員只能建立自己的身份" },
  { value: "claim_only", label: "僅取代佔位成員", description: "新成員只能取代現有的佔位成員" },
]

// Helper function to format date as YYYY-MM-DD in local timezone
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper function to create a Date object from YYYY-MM-DD string in local timezone
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day)
}

// Helper function to parse ISO date string to YYYY-MM-DD
function isoToLocalDate(isoStr: string): string {
  const date = new Date(isoStr)
  return formatLocalDate(date)
}

export default function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const authFetch = useAuthFetch()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [cover, setCover] = useState<string | null>(null)
  const [budget, setBudget] = useState("")
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [joinMode, setJoinMode] = useState("both")
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY)
  const [customRates, setCustomRates] = useState<Record<string, string>>({})
  const [expenseCurrencies, setExpenseCurrencies] = useState<string[]>([])
  const [defaultRates, setDefaultRates] = useState<Record<string, number>>({})

  const backHref = `/projects/${id}`

  useEffect(() => {
    fetchProject()
    fetchCurrentUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // 當有不同幣別的支出時，獲取預設匯率
  useEffect(() => {
    if (expenseCurrencies.length > 0) {
      fetchDefaultRates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseCurrencies])

  async function fetchDefaultRates() {
    try {
      const res = await authFetch("/api/exchange-rates")
      if (res.ok) {
        const data = await res.json()
        setDefaultRates(data.rates || {})
      }
    } catch (error) {
      console.error("獲取匯率錯誤:", error)
    }
  }

  // 計算從一種幣別到另一種幣別的匯率
  function getConversionRate(fromCurrency: string, toCurrency: string): number | null {
    if (!defaultRates || Object.keys(defaultRates).length === 0) return null
    const fromRate = defaultRates[fromCurrency]
    const toRate = defaultRates[toCurrency]
    if (!fromRate || !toRate) return null
    // 透過 USD 作為中介轉換
    return Math.round((toRate / fromRate) * 10000) / 10000
  }

  async function fetchCurrentUser() {
    try {
      const res = await authFetch("/api/users/profile")
      if (res.ok) {
        const data = await res.json()
        setCurrentUserId(data.id)
      }
    } catch (error) {
      console.error("獲取用戶資料錯誤:", error)
    }
  }

  async function fetchProject() {
    try {
      const res = await authFetch(`/api/projects/${id}`)
      if (res.ok) {
        const data = await res.json()
        setProject(data)

        // Initialize form with project data
        setName(data.name)
        setDescription(data.description || "")
        setCover(data.cover)
        setBudget(data.budget ? String(Number(data.budget)) : "")
        setJoinMode(data.joinMode || "both")
        setCurrency((data.currency as CurrencyCode) || DEFAULT_CURRENCY)

        // 設定自訂匯率
        if (data.customRates) {
          const ratesStr: Record<string, string> = {}
          for (const [curr, rate] of Object.entries(data.customRates)) {
            ratesStr[curr] = String(rate)
          }
          setCustomRates(ratesStr)
        }

        // 收集專案中使用的幣別（排除結算幣別）
        if (data.expenses) {
          const currencies = new Set<string>()
          data.expenses.forEach((exp: { currency: string }) => {
            if (exp.currency && exp.currency !== data.currency) {
              currencies.add(exp.currency)
            }
          })
          setExpenseCurrencies(Array.from(currencies))
        }

        if (data.startDate) {
          const start = isoToLocalDate(data.startDate)
          setStartDate(start)
          if (data.endDate) {
            const end = isoToLocalDate(data.endDate)
            setEndDate(end)
            setDateRange({
              from: parseLocalDate(start),
              to: parseLocalDate(end),
            })
          } else {
            setDateRange({
              from: parseLocalDate(start),
            })
          }
        }
      }
    } catch (error) {
      console.error("獲取專案錯誤:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      alert("請輸入專案名稱")
      return
    }

    // 驗證日期
    if (startDate && endDate && parseLocalDate(startDate) > parseLocalDate(endDate)) {
      alert("結束日需晚於出發日")
      return
    }

    setSaving(true)

    try {
      const res = await authFetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          cover: cover,
          budget: budget ? Number(budget) : null,
          currency: currency,
          startDate: startDate || null,
          endDate: endDate || null,
          joinMode: joinMode,
          customRates: Object.keys(customRates).length > 0
            ? Object.fromEntries(
                Object.entries(customRates)
                  .filter(([, v]) => v.trim() !== "")
                  .map(([k, v]) => [k, Number(v)])
              )
            : null,
        }),
      })

      if (res.ok) {
        router.push(`/projects/${id}`)
      } else {
        const error = await res.json()
        alert(error.error || "更新失敗")
      }
    } catch (error) {
      console.error("更新專案錯誤:", error)
      alert("更新失敗")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)

    try {
      const res = await authFetch(`/api/projects/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        router.push("/projects")
      } else {
        const error = await res.json()
        alert(error.error || "刪除失敗")
      }
    } catch (error) {
      console.error("刪除專案錯誤:", error)
      alert("刪除失敗")
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  function formatDateRange(start: string | null, end: string | null): string {
    if (!start && !end) return "選擇日期"
    if (start && !end) return `${start} 至 ...`
    if (!start && end) return `... 至 ${end}`
    return `${start} 至 ${end}`
  }

  const isCreator = currentUserId && project?.createdBy === currentUserId

  if (loading) {
    return (
      <AppLayout title="專案設定" showBack backHref={backHref}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  if (!project) {
    return (
      <AppLayout title="專案設定" showBack backHref={backHref}>
        <div className="px-4 py-20 text-center text-muted-foreground">
          專案不存在
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="專案設定" showBack backHref={backHref}>
      <form onSubmit={handleSave} className="space-y-6">
        {/* 專案名稱 */}
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            專案名稱 <span className="text-destructive">*</span>
          </label>
          <Input
            id="name"
            placeholder="例如：日本關西 5 天、歐洲自由行"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            required
          />
        </div>

        {/* 封面圖片 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">封面圖片</label>
          <CoverPicker value={cover} onChange={setCover} disabled={saving} />
        </div>

        {/* 旅程日期 */}
        <div className="space-y-2">
          <label htmlFor="dates" className="text-sm font-medium">
            出發日與結束日
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal" type="button" disabled={saving}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDateRange(startDate, endDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={8}
              collisionPadding={16}
              className="p-2 w-[calc(100vw-32px)] max-w-[360px]"
            >
              <div className="flex items-center justify-center">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  className="p-2 [--cell-size:--spacing(10)] text-sm"
                  onSelect={(range) => {
                    setDateRange(range)
                    if (range?.from && range?.to) {
                      const from = formatLocalDate(range.from)
                      const to = formatLocalDate(range.to)
                      setStartDate(from)
                      setEndDate(to)
                    } else if (range?.from) {
                      const from = formatLocalDate(range.from)
                      setStartDate(from)
                      setEndDate(null)
                    } else {
                      setStartDate(null)
                      setEndDate(null)
                    }
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* 預算設定 */}
        <div className="space-y-2">
          <label htmlFor="budget" className="text-sm font-medium">
            旅程預算（選填）
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="budget"
              type="number"
              placeholder="10000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              disabled={saving}
              className="pl-7"
              min="0"
              step="1"
            />
          </div>
          <p className="text-xs text-muted-foreground">設定預算後，可在專案頁面查看花費進度</p>
        </div>

        {/* 結算幣別 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            結算幣別
          </label>
          <CurrencySelect
            value={currency}
            onChange={setCurrency}
            disabled={saving}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            所有費用將以此幣別進行結算計算
          </p>
        </div>

        {/* 自訂匯率 */}
        {expenseCurrencies.length > 0 && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                自訂匯率（選填）
              </label>
              <p className="text-xs text-muted-foreground">
                若不設定，將使用即時匯率進行結算
              </p>
            </div>
            <div className="space-y-2">
              {expenseCurrencies.map((curr) => {
                const info = getCurrencyInfo(curr)
                const defaultRate = getConversionRate(curr, currency)
                const currentRate = customRates[curr] ? Number(customRates[curr]) : defaultRate
                const isCustom = customRates[curr] && customRates[curr].trim() !== ""
                return (
                  <div key={curr} className="space-y-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-24 shrink-0">
                        <span className="text-lg w-8 text-right">{info.symbol}</span>
                        <span className="text-sm font-medium">{curr}</span>
                      </div>
                      <span className="text-muted-foreground">=</span>
                      <div className="flex-1 relative">
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          placeholder={defaultRate ? `${defaultRate}` : "輸入匯率"}
                          value={customRates[curr] || ""}
                          onChange={(e) => {
                            setCustomRates((prev) => ({
                              ...prev,
                              [curr]: e.target.value,
                            }))
                          }}
                          disabled={saving}
                          className="pr-16"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          {currency}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground ml-27">
                      {isCustom ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          使用自訂匯率：1 {curr} = {currentRate} {currency}
                        </span>
                      ) : (
                        <span>
                          使用即時匯率：1 {curr} = {defaultRate || "..."} {currency}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-600 dark:text-blue-400">
                自訂匯率會覆蓋即時匯率，用於結算計算。留空則使用即時匯率。
              </p>
            </div>
          </div>
        )}

        {/* 專案描述 */}
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            描述（選填）
          </label>
          <Textarea
            id="description"
            placeholder="記錄這次旅行的目的地、日期等資訊..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
            rows={4}
          />
        </div>

        {/* 成員加入模式 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">成員加入方式</label>
          <p className="text-xs text-muted-foreground">設定新成員透過分享連結加入時的方式</p>
          <div className="space-y-2 mt-3">
            {JOIN_MODE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  joinMode === option.value
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="joinMode"
                  value={option.value}
                  checked={joinMode === option.value}
                  onChange={(e) => setJoinMode(e.target.value)}
                  disabled={saving}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 儲存與取消按鈕 */}
        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? "儲存中..." : "儲存變更"}
          </Button>
          <Link href={backHref} className="flex-1">
            <Button type="button" variant="outline" className="w-full" disabled={saving}>
              取消
            </Button>
          </Link>
        </div>

        {/* 危險區域 - 刪除專案 */}
        {isCreator && (
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 border border-red-200 dark:border-red-900">
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">
                危險區域
              </h3>
              <p className="text-xs text-red-500 dark:text-red-400/80 mb-3">
                刪除專案後，所有成員、支出紀錄都會永久移除，此操作無法復原。
              </p>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={saving}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                刪除專案
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* 刪除確認對話框 */}
      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="確認刪除專案"
        description={`確定要刪除「${project.name}」嗎？所有成員、支出紀錄都會永久移除，此操作無法復原。`}
        onConfirm={handleDelete}
        loading={deleting}
        confirmText="確認刪除"
      />
    </AppLayout>
  )
}
