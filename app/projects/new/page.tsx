"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { CoverPicker } from "@/components/cover-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY, type CurrencyCode } from "@/lib/constants/currencies"

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

const JOIN_MODE_OPTIONS = [
  { value: "both", label: "兩者皆可", description: "新成員可選擇建立新身份或取代佔位成員" },
  { value: "create_only", label: "僅建立新成員", description: "新成員只能建立自己的身份" },
  { value: "claim_only", label: "僅取代佔位成員", description: "新成員只能取代現有的佔位成員" },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [cover, setCover] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const authFetch = useAuthFetch()

  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [budget, setBudget] = useState("")
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [joinMode, setJoinMode] = useState("both")

  async function handleSubmit(e: React.FormEvent) {
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

    setLoading(true)

    try {
      const res = await authFetch("/api/projects", {
        method: "POST",
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
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        console.error("建立專案失敗:", error)

        const errorMessage = error.details
          ? `${error.error || "建立專案失敗"}\n詳情: ${error.details}`
          : error.error || "建立專案失敗"
        alert(errorMessage)
        setLoading(false)
        return
      }

      const project = await res.json()
      // 導航到新建立的專案
      router.push(`/projects/${project.id}`)
    } catch (error) {
      console.error("建立專案錯誤:", error)
      alert("建立專案失敗")
      setLoading(false)
    }
  }

  function formatDateRange(start: string | null, end: string | null): string {
    if (!start && !end) return "選擇日期"
    if (start && !end) return `${start} 至 ...`
    if (!start && end) return `... 至 ${end}`
    return `${start} 至 ${end}`
  }

  return (
    <AppLayout title="新增專案" showBack>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            專案名稱 <span className="text-destructive">*</span>
          </label>
          <Input
            id="name"
            placeholder="例如：日本關西 5 天、歐洲自由行"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">封面圖片</label>
          <CoverPicker value={cover} onChange={setCover} disabled={loading} />
        </div>

        <div className="space-y-2">
          <label htmlFor="dates" className="text-sm font-medium">
            出發日與結束日
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal" type="button">
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

        <div className="space-y-2">
          <label htmlFor="currency" className="text-sm font-medium">
            結算幣別
          </label>
          <Select value={currency} onValueChange={(value) => setCurrency(value as CurrencyCode)} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="選擇幣別" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">此幣別用於結算和統計顯示</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="budget" className="text-sm font-medium">
            旅程預算（選填）
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {currency}
            </span>
            <Input
              id="budget"
              type="number"
              placeholder="10000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              disabled={loading}
              className="pl-12"
              min="0"
              step="1"
            />
          </div>
          <p className="text-xs text-muted-foreground">設定預算後，可在專案頁面查看花費進度</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            描述（選填）
          </label>
          <Textarea
            id="description"
            placeholder="記錄這次旅行的目的地、日期等資訊..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
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
                  disabled={loading}
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

        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "建立中..." : "建立專案"}
          </Button>
          <Link href="/projects" className="flex-1">
            <Button type="button" variant="outline" className="w-full" disabled={loading}>
              取消
            </Button>
          </Link>
        </div>
      </form>
    </AppLayout>
  )
}
