"use client"

import { use } from "react"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Download, FileSpreadsheet, FileText, ArrowLeft } from "lucide-react"

export default function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const backHref = `/projects/${id}`

  return (
    <AppLayout title="匯出" showBack backHref={backHref}>
      <div className="px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          {/* 圖標 */}
          <div className="h-20 w-20 rounded-2xl bg-cyan-50 dark:bg-cyan-950 flex items-center justify-center mx-auto mb-6">
            <Download className="h-10 w-10 text-cyan-600 dark:text-cyan-400" />
          </div>

          {/* 標題 */}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            匯出功能
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            即將推出
          </p>

          {/* 功能說明 */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-left mb-6">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
              功能說明
            </h2>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>CSV 匯出</strong> - 將支出記錄匯出為 CSV 格式，可在 Excel 或 Google Sheets 中開啟</span>
              </li>
              <li className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <span><strong>PDF 匯出</strong> - 產生精美的 PDF 報表，方便列印或分享</span>
              </li>
              <li className="flex items-start gap-3">
                <Download className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <span><strong>選擇匯出範圍</strong> - 可選擇特定日期區間或分類進行匯出</span>
              </li>
            </ul>
          </div>

          {/* 返回按鈕 */}
          <Link href={`/projects/${id}`}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回專案
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
