"use client"

import { use } from "react"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { StickyNote, PenLine, Pin, Search, ArrowLeft } from "lucide-react"

export default function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <AppLayout title="筆記" showBack>
      <div className="px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          {/* 圖標 */}
          <div className="h-20 w-20 rounded-2xl bg-yellow-50 dark:bg-yellow-950 flex items-center justify-center mx-auto mb-6">
            <StickyNote className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
          </div>

          {/* 標題 */}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            筆記功能
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
                <PenLine className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <span><strong>旅程筆記</strong> - 記錄旅途中的重要事項、行程安排或心得感想</span>
              </li>
              <li className="flex items-start gap-3">
                <Pin className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <span><strong>置頂重要筆記</strong> - 將重要資訊置頂，方便快速查看</span>
              </li>
              <li className="flex items-start gap-3">
                <Search className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>搜尋筆記</strong> - 快速搜尋過往的筆記內容</span>
              </li>
              <li className="flex items-start gap-3">
                <StickyNote className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <span><strong>共享筆記</strong> - 所有成員都能查看和編輯共同筆記</span>
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
