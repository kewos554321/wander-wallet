"use client"

import Link from "next/link"
import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

// Helper function to format date as YYYY-MM-DD in local timezone
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper function to create a Date object from YYYY-MM-DD string in local timezone
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export default function NewProjectPage() {
  const [name, setName] = useState("")
  const todayStr = formatLocalDate(new Date())
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: parseLocalDate(todayStr), to: parseLocalDate(todayStr) })
  
  const [participants] = useState<Array<{ id: string; displayName: string; email: string; role: "owner" | "editor" | "viewer" }>>([
    { id: crypto.randomUUID(), displayName: "我", email: "", role: "owner" },
  ])

  

  function handleSubmit() {
    // Basic inline validation for required fields
    if (!name.trim()) return alert("請輸入專案名稱")
    if (!startDate || !endDate) return alert("請選擇出發日與結束日")
    if (parseLocalDate(startDate) > parseLocalDate(endDate)) return alert("結束日需晚於出發日")

    // Mock submit: print payload for now
    const payload = {
      name,
      startDate,
      endDate,
      participants,
    }
    alert("已建立（示範）")
  }

  return (
    <AppLayout title="新增專案" showBack>
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">專案名稱</label>
          <Input
            placeholder="例如：日本關西 5 天"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">出發日與結束日</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate} 至 {endDate}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="center"
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
                    const v = formatLocalDate(range.from)
                    setStartDate(v)
                    setEndDate(v)
                  }
                }}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleSubmit}>建立</Button>
          <Link href="/projects" className="flex-1">
            <Button variant="outline" className="w-full">取消</Button>
          </Link>
        </div>
        <div>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              try {
                const res = await fetch("/api/users")
                if (!res.ok) {
                  alert("讀取 users 失敗")
                  return
                }
                const data = await res.json()
                alert(JSON.stringify(data, null, 2))
              } catch {
                alert("讀取 users 發生錯誤")
              }
            }}
          >
            測試讀取使用者（Alert）
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}


