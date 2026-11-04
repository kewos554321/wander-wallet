import { useCallback, useEffect, useState } from "react"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { DEFAULT_CURRENCY, getCurrencyDecimals } from "@/lib/constants/currencies"

// 簡易快取（避免重複請求）
const projectCache = new Map<string, { data: Project; timestamp: number }>()
const membersCache = new Map<string, { data: ProjectMember[]; timestamp: number }>()
const CACHE_DURATION = 30 * 1000 // 30 秒

export interface ProjectMember {
  id: string
  role: string
  displayName: string
  userId: string | null
  /** Per-project remainder ledger; drives which member absorbs a rounding unit. */
  remainderDiscrepancy?: number
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
  expenses?: {
    id?: string
    currency: string
    /** Prisma Decimal over JSON (a string) or a number. */
    exchangeRate: number | string | null
    rateKind: string | null
    rateDate: string | null
    description: string | null
    expenseDate: string
  }[]
}

interface UseProjectDataOptions {
  /** 是否自動載入 */
  autoFetch?: boolean
  /** 是否包含旅伴資料 */
  includeMembers?: boolean
}

interface UseProjectDataReturn {
  project: Project | null
  members: ProjectMember[]
  loading: boolean
  error: string | null
  /** 旅程幣別（預設 TWD） */
  projectCurrency: string
  /** 自訂匯率（固定匯率；未設定的幣別走即時） */
  customRates: Record<string, number> | null
  /** 匯率計算精度（預設 2） */
  precision: number
  /** 重新載入旅程資料 */
  refetch: () => Promise<void>
  /** 重新載入旅伴資料 */
  refetchMembers: () => Promise<void>
  /** 清除快取並重新載入 */
  invalidate: () => Promise<void>
}

/**
 * 旅程資料 Hook
 * 提供旅程資料和旅伴資料的統一存取，包含簡易快取
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

  // 載入旅程資料
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
        throw new Error("無法載入旅程")
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

  // 載入旅伴資料
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
        throw new Error("無法載入旅伴")
      }
      const data = await res.json()
      setMembers(data)
      membersCache.set(projectId, { data, timestamp: Date.now() })
      return data
    } catch (err) {
      console.error("載入旅伴失敗:", err)
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
    precision: getCurrencyDecimals(project?.currency || DEFAULT_CURRENCY),
    refetch: fetchProject.bind(null, false),
    refetchMembers: fetchMembers.bind(null, false),
    invalidate,
  }
}

/**
 * 清除所有旅程快取
 */
export function clearProjectCache() {
  projectCache.clear()
  membersCache.clear()
}

/**
 * 清除特定旅程的快取
 */
export function invalidateProjectCache(projectId: string) {
  projectCache.delete(projectId)
  membersCache.delete(projectId)
}
