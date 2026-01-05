"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Eye,
  MousePointerClick,
  Percent,
  Megaphone,
  ArrowRight,
  TrendingUp,
} from "lucide-react"

interface DashboardStats {
  totalAds: number
  activeAds: number
  totalImpressions: number
  totalClicks: number
  todayImpressions: number
  todayClicks: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const res = await fetch("/api/admin/stats")
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error("獲取統計數據失敗:", error)
    } finally {
      setLoading(false)
    }
  }

  const ctr = stats && stats.totalImpressions > 0
    ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2)
    : "0.00"

  const todayCtr = stats && stats.todayImpressions > 0
    ? ((stats.todayClicks / stats.todayImpressions) * 100).toFixed(2)
    : "0.00"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">儀表板</h1>
        <p className="text-muted-foreground">廣告系統總覽</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              活躍廣告
            </CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.activeAds ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  / {stats?.totalAds ?? 0}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              總曝光數
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.totalImpressions?.toLocaleString() ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              總點擊數
            </CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.totalClicks?.toLocaleString() ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              點擊率 (CTR)
            </CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{ctr}%</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            今日數據
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">
                {loading ? (
                  <Skeleton className="h-8 w-16 mx-auto" />
                ) : (
                  stats?.todayImpressions?.toLocaleString() ?? 0
                )}
              </p>
              <p className="text-sm text-muted-foreground">曝光</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {loading ? (
                  <Skeleton className="h-8 w-16 mx-auto" />
                ) : (
                  stats?.todayClicks?.toLocaleString() ?? 0
                )}
              </p>
              <p className="text-sm text-muted-foreground">點擊</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {loading ? (
                  <Skeleton className="h-8 w-16 mx-auto" />
                ) : (
                  `${todayCtr}%`
                )}
              </p>
              <p className="text-sm text-muted-foreground">CTR</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link
            href="/admin/ads/new"
            className="flex items-center justify-between p-3 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950 dark:hover:bg-brand-900 transition-colors"
          >
            <span className="font-medium text-brand-700 dark:text-brand-300">
              建立新廣告
            </span>
            <ArrowRight className="h-4 w-4 text-brand-600" />
          </Link>
          <Link
            href="/admin/ads"
            className="flex items-center justify-between p-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="font-medium">管理所有廣告</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/admin/analytics"
            className="flex items-center justify-between p-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="font-medium">查看分析報表</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
