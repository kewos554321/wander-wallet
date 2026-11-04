"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { isoToLocalDate } from "@/components/v2/project/date-utils"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { toUpdatePayload, useProjectForm, type JoinMode, type ProjectFormValues } from "@/lib/hooks/use-project-form"
import { DeleteProjectSheet } from "./delete-project-sheet"
import { ProjectSettingsV2View } from "./project-settings-v2-view"

interface ProjectRecord {
  id: string
  name: string
  description: string | null
  cover: string | null
  budget: string | number | null
  currency: string | null
  startDate: string | null
  endDate: string | null
  joinMode: string
  exchangeRatePrecision: number
  createdBy: string
  creator?: { id: string }
  expenses?: Array<{ currency: string }>
}

const EMPTY_VALUES: ProjectFormValues = {
  name: "",
  description: "",
  cover: null,
  startDate: null,
  endDate: null,
  currency: "TWD",
  budget: "",
  joinMode: "both",
}

// Maps the API record to the form values used by this screen.
function mapProjectToForm(data: ProjectRecord): ProjectFormValues {
  return {
    name: data.name,
    description: data.description || "",
    cover: data.cover,
    startDate: data.startDate ? isoToLocalDate(data.startDate) : null,
    endDate: data.endDate ? isoToLocalDate(data.endDate) : null,
    currency: data.currency || "TWD",
    budget: data.budget ? String(Number(data.budget)) : "",
    joinMode: (data.joinMode as JoinMode) || "both",
  }
}

export function ProjectSettingsV2({ projectId }: { projectId: string }) {
  const router = useRouter()
  const authFetch = useAuthFetch()

  const [project, setProject] = useState<ProjectRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { values, set, error: formError, reset } = useProjectForm(EMPTY_VALUES)

  // Editing any field makes the previous save/validation error stale — clear it
  // so a fixed form never keeps showing the old message.
  useEffect(() => {
    setSubmitError(null)
  }, [values])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [projectRes, profileRes] = await Promise.all([authFetch(`/api/projects/${projectId}`), authFetch("/api/users/profile")])
        if (profileRes.ok) {
          const profile = await profileRes.json()
          if (!cancelled) setCurrentUserId(profile.id)
        }
        if (!projectRes.ok) {
          if (!cancelled) setProject(null)
          return
        }
        const data: ProjectRecord = await projectRes.json()
        if (cancelled) return
        setProject(data)
        reset(mapProjectToForm(data))
      } catch {
        if (!cancelled) setProject(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function handleSave() {
    if (formError) {
      setSubmitError(formError)
      return
    }
    setSubmitError(null)
    setSaving(true)
    try {
      const res = await authFetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toUpdatePayload(values)),
      })
      if (res.ok) {
        router.push(`/projects/${projectId}`)
      } else {
        const data = await res.json().catch(() => ({}))
        setSubmitError(data.error || "更新失敗")
      }
    } catch {
      setSubmitError("更新失敗")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await authFetch(`/api/projects/${projectId}`, { method: "DELETE" })
      if (res.ok) {
        router.push("/projects")
      } else {
        setDeleteError("刪除失敗")
      }
    } catch {
      setDeleteError("刪除失敗")
    } finally {
      setDeleting(false)
    }
  }

  const isCreator = !!currentUserId && (project?.createdBy === currentUserId || project?.creator?.id === currentUserId)
  const backHref = `/projects/${projectId}`

  let content
  if (loading) {
    content = (
      <>
        <V2TopBar title="旅程設定" backHref={backHref} />
        <div data-testid="v2-project-settings-skeleton" className="space-y-3 p-4">
          <div className="h-64 animate-pulse rounded-2xl bg-v2-sand" />
        </div>
      </>
    )
  } else if (!project) {
    content = (
      <>
        <V2TopBar title="旅程設定" backHref={backHref} />
        <p className="py-8 text-center text-v2-ink-muted">旅程不存在</p>
      </>
    )
  } else {
    content = (
      <>
        <V2TopBar title="旅程設定" backHref={backHref} />
        <ProjectSettingsV2View
          values={values}
          set={set}
          isCreator={isCreator}
          saving={saving}
          submitError={submitError}
          onCancel={() => router.push(backHref)}
          onSave={handleSave}
          onRequestDelete={() => setShowDelete(true)}
        />
        {showDelete && (
          <DeleteProjectSheet
            open
            deleting={deleting}
            error={deleteError}
            onCancel={() => setShowDelete(false)}
            onConfirm={handleDelete}
          />
        )}
      </>
    )
  }

  return (
      <div className="mx-auto max-w-md">{content}</div>
  )
}
