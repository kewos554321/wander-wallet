"use client"

import { useEffect, useState } from "react"
import { useAuthFetch } from "@/components/auth/liff-provider"

export interface ProjectListMember {
  id: string
  displayName: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
  role: string
}

export interface ProjectListItem {
  id: string
  name: string
  description: string | null
  cover: string | null
  startDate: string | null
  endDate: string | null
  currency: string
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    name: string | null
    email: string
  }
  members: ProjectListMember[]
  totalAmount: number
  _count: {
    expenses: number
    members: number
  }
}

export function useProjects() {
  const authFetch = useAuthFetch()
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await authFetch("/api/projects")
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          console.error("獲取專案失敗:", res.status, errorData)
          return
        }
        setProjects(await res.json())
      } catch (error) {
        console.error("獲取專案錯誤:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { projects, loading }
}
