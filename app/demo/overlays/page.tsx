"use client"

// DEMO — side-by-side sanity check for the shared shadcn primitives that v2
// screens import. Toggle 改前 (v1 palette) / 改後 (v2 remap) and open the same
// popover / select / confirm / dialog in each mode.

import { useState, type ReactNode } from "react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CurrencySelect } from "@/components/ui/currency-select"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import type { CurrencyCode } from "@/lib/constants/currencies"

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export default function OverlaysDemoPage() {
  const [v2, setV2] = useState(true)
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 9, 11))
  const [fruit, setFruit] = useState("apple")
  const [currency, setCurrency] = useState<CurrencyCode>("JPY")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const body = (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-muted-foreground">版本</span>
        <div className="inline-flex rounded-full bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setV2(false)}
            aria-pressed={!v2}
            className={`rounded-full px-3 py-1 text-[12px] font-bold ${!v2 ? "bg-primary text-primary-foreground" : "text-foreground"}`}
          >
            改前（v1）
          </button>
          <button
            type="button"
            onClick={() => setV2(true)}
            aria-pressed={v2}
            className={`rounded-full px-3 py-1 text-[12px] font-bold ${v2 ? "bg-primary text-primary-foreground" : "text-foreground"}`}
          >
            改後（v2）
          </button>
        </div>
        <span className="ml-auto text-[11px] text-muted-foreground">{v2 ? "v2 湖綠 / 奶油" : "v1 teal / 胡粉"}</span>
      </div>

      <p className="text-[12px] text-muted-foreground">
        v2 畫面會打開的 shared primitives（日期、下拉、幣別、按鈕、確認框、Dialog）。切上面的版本，再打開同一個元件看色系差異。
      </p>

      <Card title="日期選擇 (Popover + Calendar)">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              {date ? format(date, "yyyy/MM/dd") : "選日期"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={setDate} />
          </PopoverContent>
        </Popover>
      </Card>

      <Card title="下拉 (Select)">
        <Select value={fruit} onValueChange={setFruit}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">蘋果</SelectItem>
            <SelectItem value="banana">香蕉</SelectItem>
            <SelectItem value="orange">橘子</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card title="幣別 (CurrencySelect)">
        <CurrencySelect value={currency} onChange={setCurrency} className="w-full" />
      </Card>

      <Card title="按鈕 (Button)">
        <div className="flex flex-wrap gap-2">
          <Button>主要</Button>
          <Button variant="outline">次要</Button>
          <Button variant="destructive">刪除</Button>
        </div>
      </Card>

      <Card title="刪除確認 (ConfirmDeleteDialog)">
        <Button variant="outline" onClick={() => setConfirmOpen(true)}>
          開啟確認框
        </Button>
        <ConfirmDeleteDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          description="這筆支出會被永久刪除，無法復原。"
          onConfirm={() => setConfirmOpen(false)}
        />
      </Card>

      <Card title="Dialog">
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          開啟 Dialog
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>邀請成員</DialogTitle>
              <DialogDescription>把連結分享給朋友，一起記帳。</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={() => setDialogOpen(false)}>送出邀請</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  )

  return v2 ? (
    <UiV2Scope>{body}</UiV2Scope>
  ) : (
    <div data-ui="v1" className="min-h-screen bg-background text-foreground">
      {body}
    </div>
  )
}
