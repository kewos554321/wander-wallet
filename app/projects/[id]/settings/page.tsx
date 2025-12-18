"use client"

import { use } from "react"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Settings, ImageIcon, Calendar, FileText, Trash2, ArrowLeft } from "lucide-react"

export default function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const backHref = `/projects/${id}`

  return (
    <AppLayout title="專案設定" showBack backHref={backHref}>
      <div className="px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          {/* 圖標 */}
          <div className="h-20 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-6">
            <Settings className="h-10 w-10 text-slate-600 dark:text-slate-400" />
          </div>

          {/* 標題 */}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            專案設定
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
                <FileText className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <span><strong>專案名稱</strong> - 修改專案名稱，讓標題更清楚</span>
              </li>
              <li className="flex items-start gap-3">
                <ImageIcon className="h-5 w-5 text-pink-500 shrink-0 mt-0.5" />
                <span><strong>專案封面</strong> - 設定專案封面圖片，一眼辨識不同旅程</span>
              </li>
              <li className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>旅程日期</strong> - 設定開始與結束日期，記錄旅程時間</span>
              </li>
              <li className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
                <span><strong>專案描述</strong> - 新增描述，記錄旅程重點或備註</span>
              </li>
              <li className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <span><strong>刪除專案</strong> - 刪除整個專案及所有相關資料</span>
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
