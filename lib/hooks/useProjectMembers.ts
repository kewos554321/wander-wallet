"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import type { JoinMode } from "@/lib/hooks/use-project-form"

export interface ManagedMember {
  id: string
  userId: string | null
  role: string
  displayName: string
  claimedAt: string | null
  user: { id: string; name: string | null; email: string; image: string | null } | null
}

export interface MembersProject {
  id: string
  name: string
  createdBy: string
  creator: { id: string; name: string | null; email: string }
  members: ManagedMember[]
  joinMode: JoinMode
}

export function useProjectMembers(projectId: string) {
  const router = useRouter()
  const authFetch = useAuthFetch()
  const { user } = useLiff()
  const [project, setProject] = useState<MembersProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      const res = await authFetch(`/api/projects/${projectId}`)
      if (res.ok) {
        setProject(await res.json())
      } else {
        router.push("/projects")
      }
    } catch {
      console.error("獲取專案錯誤")
    } finally {
      setLoading(false)
    }
  }, [authFetch, projectId, router])

  // Keyed on projectId only, like the original page.
  useEffect(() => {
    refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const addMember = useCallback(
    async (name: string): Promise<string | null> => {
      const trimmed = name.trim()
      if (!trimmed) return null
      try {
        const res = await authFetch(`/api/projects/${projectId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        })
        if (!res.ok) {
          const data = await res.json()
          return data.error || "新增失敗"
        }
        await refetch()
        return null
      } catch {
        return "新增失敗"
      }
    },
    [authFetch, projectId, refetch]
  )

  const deleteRequest = useCallback(
    (memberId: string) =>
      authFetch(`/api/projects/${projectId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      }),
    [authFetch, projectId]
  )

  const removeMember = useCallback(
    async (memberId: string) => {
      setRemoving(memberId)
      try {
        const res = await deleteRequest(memberId)
        if (!res.ok) {
          const data = await res.json()
          alert(data.error || "移除失敗")
          return false
        }
        await refetch()
        return true
      } catch {
        alert("移除失敗")
        return false
      } finally {
        setRemoving(null)
      }
    },
    [deleteRequest, refetch]
  )

  const batchRemove = useCallback(
    async (memberIds: string[]) => {
      if (memberIds.length === 0) return
      setRemoving("batch")
      try {
        const results = await Promise.all(memberIds.map(deleteRequest))
        const failCount = results.filter((res) => !res.ok).length
        if (failCount > 0) alert(`${failCount} 位成員移除失敗`)
        await refetch()
      } catch {
        alert("批次移除失敗")
      } finally {
        setRemoving(null)
      }
    },
    [deleteRequest, refetch]
  )

  const isOwner = !!project && (project.createdBy === user?.id || project.creator?.id === user?.id)

  return { project, loading, isOwner, currentUserId: user?.id ?? null, removing, refetch, addMember, removeMember, batchRemove }
}
