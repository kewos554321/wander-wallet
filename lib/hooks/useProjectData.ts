import { useCallback, useEffect, useState } from "react"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"

// 簡易快取（避免重複請求）
const projectCache = new Map<string, { data: Project; timestamp: number }>()
const membersCache = new Map<string, { data: ProjectMember[]; timestamp: number }>()
const CACHE_DURATION = 30 * 1000 // 30 秒

export interface ProjectMember {
  id: string
  role: string
  displayName: string
  userId: string | null
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
}

export interface Project {
  id: string
  name: string
  description: string | null
  budget: string | null
  currency: string
  exchangeRatePrecision: number
  startDate: string | null
  endDate: string | null
  customRates: Record<string, number> | null
  creator: {
    id: string
    name: string | null
    email: string
  }
  members?: ProjectMember[]
}

interface UseProjectDataOptions {
  /** 是否自動載入 */
  autoFetch?: boolean
  /** 是否包含成員資料 */
  includeMembers?: boolean
}

interface UseProjectDataReturn {
  project: Project | null
  members: ProjectMember[]
  loading: boolean
  error: string | null
  /** 專案幣別（預設 TWD） */
  projectCurrency: string
  /** 自訂匯率 */
  customRates: Record<string, number> | null
  /** 匯率計算精度（預設 2） */
  precision: number
  /** 重新載入專案資料 */
  refetch: () => Promise<void>
  /** 重新載入成員資料 */
  refetchMembers: () => Promise<void>
  /** 清除快取並重新載入 */
  invalidate: () => Promise<void>
}

/**
 * 專案資料 Hook
 * 提供專案資料和成員資料的統一存取，包含簡易快取
 */
export function useProjectData(
  projectId: string,
  options: UseProjectDataOptions = {}
): UseProjectDataReturn {
  const { autoFetch = true, includeMembers = true } = options

  const authFetch = useAuthFetch()
  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 檢查快取是否有效
  const isCacheValid = useCallback((cache: Map<string, { data: unknown; timestamp: number }>, key: string) => {
    const cached = cache.get(key)
    if (!cached) return false
    return Date.now() - cached.timestamp < CACHE_DURATION
  }, [])

  // 載入專案資料
  const fetchProject = useCallback(async (useCache = true) => {
    // 檢查快取
    if (useCache && isCacheValid(projectCache, projectId)) {
      const cached = projectCache.get(projectId)!
      setProject(cached.data)
      return cached.data
    }

    try {
      const res = await authFetch(`/api/projects/${projectId}`)
      if (!res.ok) {
        throw new Error("無法載入專案")
      }
      const data = await res.json()
      setProject(data)
      projectCache.set(projectId, { data, timestamp: Date.now() })
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : "載入失敗"
      setError(message)
      throw err
    }
  }, [authFetch, projectId, isCacheValid])

  // 載入成員資料
  const fetchMembers = useCallback(async (useCache = true) => {
    // 檢查快取
    if (useCache && isCacheValid(membersCache, projectId)) {
      const cached = membersCache.get(projectId)!
      setMembers(cached.data)
      return cached.data
    }

    try {
      const res = await authFetch(`/api/projects/${projectId}/members`)
      if (!res.ok) {
        throw new Error("無法載入成員")
      }
      const data = await res.json()
      setMembers(data)
      membersCache.set(projectId, { data, timestamp: Date.now() })
      return data
    } catch (err) {
      console.error("載入成員失敗:", err)
      return []
    }
  }, [authFetch, projectId, isCacheValid])

  // 載入所有資料
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const promises: Promise<unknown>[] = [fetchProject()]
      if (includeMembers) {
        promises.push(fetchMembers())
      }
      await Promise.all(promises)
    } catch {
      // 錯誤已在 fetchProject 中處理
    } finally {
      setLoading(false)
    }
  }, [fetchProject, fetchMembers, includeMembers])

  // 清除快取並重新載入
  const invalidate = useCallback(async () => {
    projectCache.delete(projectId)
    membersCache.delete(projectId)
    await fetchAll()
  }, [projectId, fetchAll])

  // 自動載入
  useEffect(() => {
    if (autoFetch) {
      fetchAll()
    }
  }, [autoFetch, fetchAll])

  return {
    project,
    members,
    loading,
    error,
    projectCurrency: project?.currency || DEFAULT_CURRENCY,
    customRates: project?.customRates || null,
    precision: project?.exchangeRatePrecision ?? 2,
    refetch: fetchProject.bind(null, false),
    refetchMembers: fetchMembers.bind(null, false),
    invalidate,
  }
}

/**
 * 清除所有專案快取
 */
export function clearProjectCache() {
  projectCache.clear()
  membersCache.clear()
}

/**
 * 清除特定專案的快取
 */
export function invalidateProjectCache(projectId: string) {
  projectCache.delete(projectId)
  membersCache.delete(projectId)
}
