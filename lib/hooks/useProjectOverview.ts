"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { useCurrencyConversion } from "@/lib/hooks/useCurrencyConversion"
import { computeProjectSummary, type OverviewProject } from "@/lib/project-overview"
import type { JoinInfo } from "@/components/project/join-project-dialog"

export function useProjectOverview(projectId: string) {
  const router = useRouter()
  const authFetch = useAuthFetch()
  const { user } = useLiff()
  const [project, setProject] = useState<OverviewProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null)
  const [joining, setJoining] = useState(false)

  const { convert } = useCurrencyConversion({
    projectCurrency: project?.currency || DEFAULT_CURRENCY,
    customRates: project?.customRates || null,
    precision: project?.exchangeRatePrecision ?? 2,
  })

  const refetch = useCallback(async () => {
    try {
      const res = await authFetch(`/api/projects/${projectId}`)
      if (!res.ok) {
        if (res.status === 404) router.push("/projects")
        return
      }
      const data = await res.json()
      if (data.isMember === false) {
        setJoinInfo({
          name: data.name,
          description: data.description,
          joinMode: data.joinMode || "both",
          unclaimedMembers: data.unclaimedMembers || [],
        })
        return
      }
      setJoinInfo(null)
      setProject(data)
    } catch {
      console.error("獲取專案錯誤")
    } finally {
      setLoading(false)
    }
  }, [authFetch, projectId, router])

  // Fetch only when the project id changes (matches the original v1 page),
  // so a session-token refresh does not trigger an extra reload.
  useEffect(() => {
    if (projectId) refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const runJoin = useCallback(
    async (url: string, body: object, fallbackError: string) => {
      setJoining(true)
      try {
        const res = await authFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          await refetch()
        } else {
          const data = await res.json()
          alert(data.error || fallbackError)
        }
      } catch {
        alert(fallbackError)
      } finally {
        setJoining(false)
      }
    },
    [authFetch, refetch]
  )

  const joinProject = useCallback(
    () => runJoin("/api/projects/join", { projectId }, "加入失敗"),
    [runJoin, projectId]
  )

  const claimMember = useCallback(
    (memberId: string) => runJoin(`/api/projects/${projectId}/members/claim`, { memberId }, "認領失敗"),
    [runJoin, projectId]
  )

  const summary = useMemo(
    () => (project ? computeProjectSummary(project, convert, user?.id ?? null) : null),
    [project, convert, user?.id]
  )

  return { project, loading, joinInfo, joining, joinProject, claimMember, refetch, summary }
}
