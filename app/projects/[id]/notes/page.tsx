"use client"

import { use, useEffect, useState, useCallback } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StickyNote, Save, Check } from "lucide-react"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"

export default function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [memo, setMemo] = useState("")
  const [originalMemo, setOriginalMemo] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const authFetch = useAuthFetch()
  const { user } = useLiff()

  const hasChanges = memo !== originalMemo

  useEffect(() => {
    fetchMemo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id])

  async function fetchMemo() {
    try {
      const res = await authFetch(`/api/projects/${id}/memo`)
      if (res.ok) {
        const data = await res.json()
        setMemo(data.memo || "")
        setOriginalMemo(data.memo || "")
      }
    } catch (error) {
      console.error("獲取備忘錄錯誤:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = useCallback(async () => {
    if (!hasChanges || saving) return

    setSaving(true)
    try {
      const res = await authFetch(`/api/projects/${id}/memo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo }),
      })

      if (res.ok) {
        setOriginalMemo(memo)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        const data = await res.json()
        alert(data.error || "儲存失敗")
      }
    } catch (error) {
      console.error("儲存備忘錄錯誤:", error)
      alert("儲存失敗")
    } finally {
      setSaving(false)
    }
  }, [authFetch, id, memo, hasChanges, saving])

  const backHref = `/projects/${id}`

  if (loading) {
    return (
      <AppLayout title="筆記" showBack backHref={backHref}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="筆記" showBack backHref={backHref}>
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* 說明 */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-yellow-50 dark:bg-yellow-950/30">
          <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
            <StickyNote className="h-4 w-4" />
            <span>所有成員共享的筆記，可記錄行程、重要資訊等</span>
          </div>
        </div>

        {/* 編輯區 */}
        <div className="flex-1 p-4">
          <Textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="在這裡輸入筆記內容...&#10;&#10;例如：&#10;- 航班：CI-123 10:00 起飛&#10;- 飯店：XXX Hotel&#10;- WiFi 密碼：abc123"
            className="h-full resize-none text-base"
          />
        </div>

        {/* 儲存按鈕 */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="w-full"
          >
            {saved ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                已儲存
              </>
            ) : saving ? (
              "儲存中..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {hasChanges ? "儲存變更" : "儲存"}
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
