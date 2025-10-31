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

export default function NewProjectPage() {
  const [name, setName] = useState("")
  const todayStr = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(todayStr), to: new Date(todayStr) })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [participants, setParticipants] = useState<Array<{ id: string; displayName: string; email: string; role: "owner" | "editor" | "viewer" }>>([
    { id: crypto.randomUUID(), displayName: "我", email: "", role: "owner" },
  ])

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setCoverFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setCoverPreviewUrl(url)
    } else {
      setCoverPreviewUrl(null)
    }
  }

  function addParticipant() {
    setParticipants(prev => [
      ...prev,
      { id: crypto.randomUUID(), displayName: "", email: "", role: "editor" },
    ])
  }

  function updateParticipant(id: string, updates: Partial<{ displayName: string; email: string; role: "owner" | "editor" | "viewer" }>) {
    setParticipants(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)))
  }

  function removeParticipant(id: string) {
    setParticipants(prev => prev.filter(p => p.id !== id))
  }

  function handleSubmit() {
    // Basic inline validation for required fields
    if (!name.trim()) return alert("請輸入專案名稱")
    if (!startDate || !endDate) return alert("請選擇出發日與結束日")
    if (new Date(startDate) > new Date(endDate)) return alert("結束日需晚於出發日")

    // Mock submit: print payload for now
    const payload = {
      name,
      startDate,
      endDate,
      coverFileName: coverFile?.name ?? null,
      participants,
    }
    // eslint-disable-next-line no-console
    console.log("createProject", payload)
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
            <PopoverContent align="start" className="p-0">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range)
                  if (range?.from && range?.to) {
                    const from = range.from.toISOString().slice(0,10)
                    const to = range.to.toISOString().slice(0,10)
                    setStartDate(from)
                    setEndDate(to)
                  } else if (range?.from) {
                    const v = range.from.toISOString().slice(0,10)
                    setStartDate(v)
                    setEndDate(v)
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="block text-sm mb-1">封面</label>
          <div className="flex items-center gap-3">
            <Input type="file" accept="image/*" onChange={handleCoverChange} />
            {coverPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreviewUrl} alt="封面預覽" className="h-12 w-12 rounded object-cover border" />
            ) : null}
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm">參與者與權限</label>
          <div className="space-y-2">
            {participants.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-2">
                <Input
                  placeholder={idx === 0 ? "擁有者（預設為自己）" : "姓名/暱稱"}
                  value={p.displayName}
                  onChange={e => updateParticipant(p.id, { displayName: e.target.value })}
                />
                <Input
                  placeholder="Email（可空白，之後邀請）"
                  type="email"
                  value={p.email}
                  onChange={e => updateParticipant(p.id, { email: e.target.value })}
                />
                <select
                  className="h-9 rounded-md border px-2 text-sm"
                  value={p.role}
                  onChange={e => updateParticipant(p.id, { role: e.target.value as any })}
                >
                  <option value="owner">擁有者</option>
                  <option value="editor">可編輯</option>
                  <option value="viewer">僅檢視</option>
                </select>
                {idx > 0 ? (
                  <Button variant="outline" onClick={() => removeParticipant(p.id)}>移除</Button>
                ) : null}
              </div>
            ))}
            <div>
              <Button variant="outline" onClick={addParticipant}>新增旅伴</Button>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleSubmit}>建立</Button>
          <Link href="/projects" className="flex-1">
            <Button variant="outline" className="w-full">取消</Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}


