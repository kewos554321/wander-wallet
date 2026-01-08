"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Eye,
  MousePointerClick,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  Pause,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Advertisement } from "@/types/ads"

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "草稿", variant: "secondary" },
  active: { label: "啟用中", variant: "default" },
  paused: { label: "已暫停", variant: "outline" },
  archived: { label: "已封存", variant: "destructive" },
}

const typeLabels: Record<string, string> = {
  banner: "橫幅",
  native: "原生",
  interstitial: "插頁",
}

export default function AdsListPage() {
  const router = useRouter()
  const [ads, setAds] = useState<Advertisement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAds()
  }, [])

  async function fetchAds() {
    try {
      const res = await fetch("/api/admin/ads")
      if (res.ok) {
        const data = await res.json()
        setAds(data)
      }
    } catch (error) {
      console.error("獲取廣告列表失敗:", error)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        fetchAds()
      }
    } catch (error) {
      console.error("更新狀態失敗:", error)
    }
  }

  async function deleteAd(id: string) {
    if (!confirm("確定要刪除這則廣告嗎？")) return

    try {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        fetchAds()
      }
    } catch (error) {
      console.error("刪除廣告失敗:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">廣告管理</h1>
          <p className="text-muted-foreground">管理所有廣告內容與投放設定</p>
        </div>
        <Link href="/admin/ads/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新增廣告
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-32 h-20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : ads.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">尚無廣告</h3>
            <p className="text-muted-foreground text-sm mb-4">
              建立你的第一則廣告開始投放
            </p>
            <Link href="/admin/ads/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新增廣告
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ads.map((ad) => {
            const statusInfo = statusLabels[ad.status] || statusLabels.draft
            const ctr = ad.totalImpressions > 0
              ? ((ad.totalClicks / ad.totalImpressions) * 100).toFixed(2)
              : "0.00"

            return (
              <Card
                key={ad.id}
                className="overflow-hidden cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors py-0"
                onClick={() => router.push(`/admin/ads/${ad.id}`)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex gap-3">
                    {/* Preview Image */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                      {ad.imageUrl ? (
                        <Image
                          src={ad.imageUrl}
                          alt={ad.title}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                          無圖
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                      {/* Row 1: Title + Menu */}
                      <div className="flex items-center justify-between gap-1.5">
                        <h3 className="font-semibold truncate text-lg sm:text-xl leading-tight">{ad.title}</h3>
                        <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 -mr-1.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/ads/${ad.id}`}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  編輯
                                </Link>
                              </DropdownMenuItem>
                              {ad.status === "active" ? (
                                <DropdownMenuItem onClick={() => updateStatus(ad.id, "paused")}>
                                  <Pause className="h-4 w-4 mr-2" />
                                  暫停
                                </DropdownMenuItem>
                              ) : ad.status !== "archived" ? (
                                <DropdownMenuItem onClick={() => updateStatus(ad.id, "active")}>
                                  <Play className="h-4 w-4 mr-2" />
                                  啟用
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteAd(ad.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                刪除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Row 2: Badge + Type + Stats */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={statusInfo.variant} className="text-[11px] px-1.5 py-0 h-[18px]">
                            {statusInfo.label}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {typeLabels[ad.type] || ad.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground">
                          <div className="flex items-center gap-0.5">
                            <Eye className="h-3 w-3" />
                            <span>{ad.totalImpressions.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <MousePointerClick className="h-3 w-3" />
                            <span>{ad.totalClicks.toLocaleString()}</span>
                          </div>
                          <span>{ctr}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
