"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Upload, X, Loader2, Eye, MousePointerClick, Crop } from "lucide-react"
import Link from "next/link"
import type { AdPlacementType, AdType, AdStatus, Advertisement } from "@/types/ads"
import { ImageCropper } from "@/components/ui/image-cropper"

const adTypes: { value: AdType; label: string }[] = [
  { value: "banner", label: "橫幅廣告" },
  { value: "native", label: "原生廣告" },
]

const adStatuses: { value: AdStatus; label: string }[] = [
  { value: "draft", label: "草稿" },
  { value: "active", label: "啟用中" },
  { value: "paused", label: "已暫停" },
  { value: "archived", label: "已封存" },
]

const adPlacements: { value: AdPlacementType; label: string }[] = [
  { value: "home", label: "首頁" },
  { value: "project-list", label: "專案列表" },
  { value: "expense-list", label: "支出列表" },
  { value: "settle", label: "結算頁面" },
]

export default function EditAdPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string>("")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    targetUrl: "",
    type: "banner" as AdType,
    status: "draft" as AdStatus,
    priority: 0,
    startDate: "",
    endDate: "",
    placements: [] as AdPlacementType[],
  })

  const [stats, setStats] = useState({
    totalImpressions: 0,
    totalClicks: 0,
  })

  useEffect(() => {
    fetchAd()
  }, [id])

  async function fetchAd() {
    try {
      const res = await fetch(`/api/admin/ads/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError("找不到該廣告")
        } else {
          setError("載入失敗")
        }
        return
      }

      const ad: Advertisement = await res.json()
      setFormData({
        title: ad.title,
        description: ad.description || "",
        imageUrl: ad.imageUrl || "",
        targetUrl: ad.targetUrl,
        type: ad.type,
        status: ad.status,
        priority: ad.priority,
        startDate: ad.startDate ? ad.startDate.slice(0, 16) : "",
        endDate: ad.endDate ? ad.endDate.slice(0, 16) : "",
        placements: ad.placements.map((p) => p.placement),
      })
      setStats({
        totalImpressions: ad.totalImpressions,
        totalClicks: ad.totalClicks,
      })
    } catch (err) {
      console.error("載入廣告失敗:", err)
      setError("載入失敗")
    } finally {
      setLoading(false)
    }
  }

  function updateField<K extends keyof typeof formData>(
    key: K,
    value: (typeof formData)[K]
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function togglePlacement(placement: AdPlacementType) {
    setFormData((prev) => ({
      ...prev,
      placements: prev.placements.includes(placement)
        ? prev.placements.filter((p) => p !== placement)
        : [...prev.placements, placement],
    }))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // 讀取檔案為 base64 並打開裁切器
    const reader = new FileReader()
    reader.onload = () => {
      setImageToCrop(reader.result as string)
      setShowCropper(true)
    }
    reader.readAsDataURL(file)

    // 清空 input 以便重新選擇同一檔案
    e.target.value = ""
  }

  async function handleCropComplete(croppedImageBase64: string) {
    setUploading(true)
    try {
      // 將 base64 轉為 Blob 再上傳
      const response = await fetch(croppedImageBase64)
      const blob = await response.blob()

      const uploadFormData = new FormData()
      uploadFormData.append("file", blob, "cropped-image.jpg")

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      })

      if (res.ok) {
        const { url } = await res.json()
        updateField("imageUrl", url)
      } else {
        alert("圖片上傳失敗")
      }
    } catch (err) {
      console.error("上傳錯誤:", err)
      alert("圖片上傳失敗")
    } finally {
      setUploading(false)
    }
  }

  function handleEditImage() {
    if (formData.imageUrl) {
      setImageToCrop(formData.imageUrl)
      setShowCropper(true)
    }
  }

  async function handleSubmit() {
    if (!formData.title.trim()) {
      alert("請輸入廣告標題")
      return
    }
    if (!formData.targetUrl.trim()) {
      alert("請輸入目標連結")
      return
    }
    if (formData.placements.length === 0) {
      alert("請選擇至少一個投放版位")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
        }),
      })

      if (res.ok) {
        router.push("/admin/ads")
      } else {
        const data = await res.json()
        alert(data.error || "儲存失敗")
      }
    } catch (err) {
      console.error("儲存錯誤:", err)
      alert("儲存失敗")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Link href="/admin/ads">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">錯誤</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const ctr = stats.totalImpressions > 0
    ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2)
    : "0.00"

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/ads">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">編輯廣告</h1>
          <p className="text-muted-foreground">修改廣告內容與設定</p>
        </div>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">成效數據</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 text-center p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-800 min-w-0">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs">曝光</span>
              </div>
              <p className="text-base sm:text-xl font-bold tabular-nums">{stats.totalImpressions.toLocaleString()}</p>
            </div>
            <div className="flex-1 text-center p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-800 min-w-0">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <MousePointerClick className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs">點擊</span>
              </div>
              <p className="text-base sm:text-xl font-bold tabular-nums">{stats.totalClicks.toLocaleString()}</p>
            </div>
            <div className="flex-1 text-center p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-800 min-w-0">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <span className="text-[10px] sm:text-xs">CTR</span>
              </div>
              <p className="text-base sm:text-xl font-bold tabular-nums">{ctr}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>基本資訊</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">廣告標題 *</Label>
            <Input
              id="title"
              placeholder="輸入廣告標題"
              value={formData.title}
              onChange={(e) => updateField("title", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">廣告描述</Label>
            <Textarea
              id="description"
              placeholder="輸入廣告描述（選填）"
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetUrl">目標連結 *</Label>
            <Input
              id="targetUrl"
              type="url"
              placeholder="https://example.com"
              value={formData.targetUrl}
              onChange={(e) => updateField("targetUrl", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">廣告類型</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => updateField("type", v as AdType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">狀態</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => updateField("status", v as AdStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">優先級</Label>
            <Input
              id="priority"
              type="number"
              min={0}
              max={100}
              placeholder="0"
              value={formData.priority}
              onChange={(e) => updateField("priority", parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">數字越大優先級越高</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>廣告素材</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>圖片</Label>
            {formData.imageUrl ? (
              <div className="relative w-full aspect-[4/1] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                <Image
                  src={formData.imageUrl}
                  alt="廣告圖片"
                  fill
                  className="object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleEditImage}
                    title="裁切圖片"
                  >
                    <Crop className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateField("imageUrl", "")}
                    title="移除圖片"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                {uploading ? (
                  <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-slate-400 mb-2" />
                    <span className="text-sm text-muted-foreground">點擊上傳圖片</span>
                    <span className="text-xs text-muted-foreground mt-1">建議尺寸: 800x200 (4:1)</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrlInput">或輸入圖片網址</Label>
            <Input
              id="imageUrlInput"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={formData.imageUrl}
              onChange={(e) => updateField("imageUrl", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>投放設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>投放版位 *</Label>
            <div className="grid grid-cols-2 gap-3">
              {adPlacements.map((placement) => (
                <label
                  key={placement.value}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Checkbox
                    checked={formData.placements.includes(placement.value)}
                    onCheckedChange={() => togglePlacement(placement.value)}
                  />
                  <span className="text-sm font-medium">{placement.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">開始時間</Label>
              <div className="relative">
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  className={formData.startDate ? "pr-8" : ""}
                />
                {formData.startDate && (
                  <button
                    type="button"
                    onClick={() => updateField("startDate", "")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "現在", days: 0 },
                  { label: "明天", days: 1 },
                  { label: "+7天", days: 7 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const date = new Date()
                      date.setDate(date.getDate() + preset.days)
                      date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
                      updateField("startDate", date.toISOString().slice(0, 16))
                    }}
                    className="px-2.5 py-1 text-xs rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
                {formData.startDate && (
                  <button
                    type="button"
                    onClick={() => updateField("startDate", "")}
                    className="px-2.5 py-1 text-xs rounded-full border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                  >
                    清除
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">結束時間</Label>
              <div className="relative">
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => updateField("endDate", e.target.value)}
                  className={formData.endDate ? "pr-8" : ""}
                />
                {formData.endDate && (
                  <button
                    type="button"
                    onClick={() => updateField("endDate", "")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "+7天", days: 7 },
                  { label: "+30天", days: 30 },
                  { label: "+90天", days: 90 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const date = new Date()
                      date.setDate(date.getDate() + preset.days)
                      date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
                      updateField("endDate", date.toISOString().slice(0, 16))
                    }}
                    className="px-2.5 py-1 text-xs rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => updateField("endDate", "")}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    !formData.endDate
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  不限
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            留空或選擇「不限」表示不限時間
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Link href="/admin/ads">
          <Button variant="outline">取消</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          儲存變更
        </Button>
      </div>

      {/* 圖片裁切器 */}
      <ImageCropper
        open={showCropper}
        onOpenChange={setShowCropper}
        imageSrc={imageToCrop}
        aspectRatio={4 / 1}
        onCropComplete={handleCropComplete}
      />
    </div>
  )
}
