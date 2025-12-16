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
          startDate: startDate || null,
          endDate: endDate || null,
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
