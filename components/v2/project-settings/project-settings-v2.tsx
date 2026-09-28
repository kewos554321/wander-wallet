"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { isoToLocalDate } from "@/components/v2/project/date-utils"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
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
  customRates: Record<string, number> | null
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
  exchangeRatePrecision: 2,
  customRates: {},
}

// Mirrors v1 fetchProject's mapping from the API record to form values.
function mapProjectToForm(data: ProjectRecord): ProjectFormValues {
  const customRates: Record<string, string> = {}
  if (data.customRates) {
    for (const [curr, rate] of Object.entries(data.customRates)) customRates[curr] = String(rate)
  }
  return {
    name: data.name,
    description: data.description || "",
    cover: data.cover,
    startDate: data.startDate ? isoToLocalDate(data.startDate) : null,
    endDate: data.endDate ? isoToLocalDate(data.endDate) : null,
    currency: data.currency || "TWD",
    budget: data.budget ? String(Number(data.budget)) : "",
    joinMode: (data.joinMode as JoinMode) || "both",
    exchangeRatePrecision: data.exchangeRatePrecision ?? 2,
    customRates,
  }
}

export function ProjectSettingsV2({ projectId }: { projectId: string }) {
  const router = useRouter()
  const authFetch = useAuthFetch()

  const [project, setProject] = useState<ProjectRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [expenseCurrencies, setExpenseCurrencies] = useState<string[]>([])
  const [rates, setRates] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { values, set, error: formError, reset } = useProjectForm(EMPTY_VALUES)

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
        const currencies = new Set<string>()
        for (const exp of data.expenses ?? []) {
          if (exp.currency && exp.currency !== data.currency) currencies.add(exp.currency)
        }
        setExpenseCurrencies(Array.from(currencies))
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

  useEffect(() => {
    if (expenseCurrencies.length === 0) return
    let cancelled = false
    authFetch("/api/exchange-rates")
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setRates(data.rates || {})
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseCurrencies])

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
        <V2TopBar title="專案設定" backHref={backHref} />
        <div data-testid="v2-project-settings-skeleton" className="space-y-3 p-4">
          <div className="h-64 animate-pulse rounded-2xl bg-v2-sand" />
        </div>
      </>
    )
  } else if (!project) {
    content = (
      <>
        <V2TopBar title="專案設定" backHref={backHref} />
        <p className="py-8 text-center text-v2-ink-muted">專案不存在</p>
      </>
    )
  } else {
    content = (
      <>
        <V2TopBar title="專案設定" backHref={backHref} />
        <ProjectSettingsV2View
          values={values}
          set={set}
          expenseCurrencies={expenseCurrencies}
          rates={rates}
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
    <UiV2Scope>
      <div className="mx-auto max-w-md">{content}</div>
    </UiV2Scope>
  )
}
