"use client"

import { use } from "react"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { ArrowRightLeft, RefreshCw, Globe, TrendingUp, ArrowLeft } from "lucide-react"

export default function CurrencyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <AppLayout title="幣種轉換" showBack>
      <div className="px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          {/* 圖標 */}
          <div className="h-20 w-20 rounded-2xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center mx-auto mb-6">
            <ArrowRightLeft className="h-10 w-10 text-amber-600 dark:text-amber-400" />
          </div>

          {/* 標題 */}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            幣種轉換
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
                <Globe className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <span><strong>多幣種支援</strong> - 支援 USD、EUR、JPY、CNY 等多種貨幣記帳</span>
              </li>
              <li className="flex items-start gap-3">
                <RefreshCw className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>即時匯率</strong> - 根據今日匯率自動換算，讓結算更準確</span>
              </li>
              <li className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
                <span><strong>匯率歷史</strong> - 記錄消費當天的匯率，避免匯差損失</span>
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
