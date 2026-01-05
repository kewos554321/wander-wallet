// 廣告相關類型定義

// 廣告類型
export type AdType = "banner" | "native" | "interstitial"

// 廣告狀態
export type AdStatus = "draft" | "active" | "paused" | "archived"

// 廣告版位
export type AdPlacementType = "home" | "project-list" | "expense-list" | "settle"

// 追蹤事件類型
export type AdEventType = "impression" | "click"

// 廣告資料（前端使用）
export interface Ad {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  targetUrl: string
  type: AdType
  status: AdStatus
  priority: number
  startDate: string | null
  endDate: string | null
}

// 廣告完整資料（管理後台使用）
export interface Advertisement extends Ad {
  targetImpressions: number | null
  targetClicks: number | null
  dailyBudget: number | null
  totalImpressions: number
  totalClicks: number
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  placements: AdPlacement[]
}

// 廣告版位配置
export interface AdPlacement {
  id: string
  advertisementId: string
  placement: AdPlacementType
  position: number
  isActive: boolean
  createdAt: string
}

// 廣告分析數據
export interface AdAnalytics {
  id: string
  advertisementId: string
  date: string
  impressions: number
  clicks: number
  uniqueUsers: number
}

// 廣告統計摘要
export interface AdStats {
  totalImpressions: number
  totalClicks: number
  ctr: number // Click-through rate
  uniqueUsers: number
}

// 廣告列表查詢參數
export interface AdListParams {
  status?: AdStatus
  type?: AdType
  placement?: AdPlacementType
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
}

// 新建廣告請求
export interface CreateAdRequest {
  title: string
  description?: string
  imageUrl?: string
  targetUrl: string
  type: AdType
  status?: AdStatus
  priority?: number
  startDate?: string
  endDate?: string
  targetImpressions?: number
  targetClicks?: number
  dailyBudget?: number
  placements?: AdPlacementType[]
}

// 更新廣告請求
export interface UpdateAdRequest extends Partial<CreateAdRequest> {
  id: string
}

// 追蹤事件請求
export interface TrackEventRequest {
  adId: string
  event: AdEventType
  userId?: string
}

// API 響應
export interface AdResponse {
  ad: Ad | null
  placement: AdPlacementType
}

// 管理員
export interface Admin {
  id: string
  email: string
  name: string
  role: "admin" | "super_admin"
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

// 管理員登入請求
export interface AdminLoginRequest {
  email: string
  password: string
}

// 管理員登入響應
export interface AdminLoginResponse {
  token: string
  admin: Admin
}

// 第三方廣告配置
export interface AdProvider {
  id: string
  name: string
  isActive: boolean
  config: Record<string, unknown> | null
  placements: Record<string, string> | null
  createdAt: string
  updatedAt: string
}
