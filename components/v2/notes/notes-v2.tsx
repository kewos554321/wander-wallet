"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { NotesV2View } from "./notes-v2-view"

export function NotesV2({ projectId }: { projectId: string }) {
  const authFetch = useAuthFetch()
  const [memo, setMemo] = useState("")
  const [originalMemo, setOriginalMemo] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await authFetch(`/api/projects/${projectId}/memo`)
        if (res.ok) {
          const data = await res.json()
          if (active) {
            const value = data.memo || ""
            setMemo(value)
            setOriginalMemo(value)
          }
        }
      } catch (error) {
        console.error("獲取筆記失敗:", error)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [authFetch, projectId])

  const handleSave = useCallback(async () => {
    if (saving || memo === originalMemo) return
    setSaving(true)
    try {
      const res = await authFetch(`/api/projects/${projectId}/memo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo }),
      })
      if (res.ok) {
        setOriginalMemo(memo)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        alert("儲存失敗")
      }
    } catch {
      alert("儲存失敗")
    } finally {
      setSaving(false)
    }
  }, [authFetch, projectId, memo, originalMemo, saving])

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <NotesV2View
          projectId={projectId}
          memo={memo}
          onMemo={setMemo}
          loading={loading}
          saving={saving}
          saved={saved}
          hasChanges={memo !== originalMemo}
          onSave={handleSave}
        />
      </div>
    </UiV2Scope>
  )
}
