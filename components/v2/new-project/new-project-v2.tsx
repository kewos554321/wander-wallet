"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { usePreferences } from "@/lib/hooks/use-preferences"
import { emptyProjectForm, toCreatePayload, useProjectForm } from "@/lib/hooks/use-project-form"
import { NewProjectV2View } from "./new-project-v2-view"

export function NewProjectV2() {
  const router = useRouter()
  const authFetch = useAuthFetch()
  const { preferences } = usePreferences()
  const { values, set, error: formError } = useProjectForm(emptyProjectForm(preferences.defaultCurrency))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (formError) {
      setError(formError)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await authFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toCreatePayload(values)),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/projects/${data.id}`)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "建立失敗，請重試")
      }
    } catch {
      setError("建立失敗，請重試")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <V2TopBar title="建立旅程" backHref="/projects" />
        <NewProjectV2View
          values={values}
          set={set}
          submitting={submitting}
          error={error}
          onCreate={handleCreate}
        />
      </div>
    </UiV2Scope>
  )
}
