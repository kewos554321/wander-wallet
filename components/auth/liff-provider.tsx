"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react"
import {
  initLiff,
  getProfile,
  isLoggedIn,
  login as liffLogin,
  logout as liffLogout,
  getAccessToken,
  isSendMessagesAvailable,
  LiffUser,
} from "@/lib/liff"
import type { UserPreferences } from "@/types/user-preferences"
import { DEFAULT_PREFERENCES } from "@/types/user-preferences"
import { debugLog } from "@/lib/debug"

// 開發模式：當 LIFF_ID 未設定時，使用模擬數據
const DEV_MODE = !process.env.NEXT_PUBLIC_LIFF_ID

// 公開路由：不需要登入
export const PUBLIC_ROUTES = ["/", "/brand-preview"]
export const PUBLIC_PREFIXES = ["/admin"]

interface AuthUser {
  id: string
  lineUserId: string
  name: string | null
  image: string | null
  preferences: UserPreferences | null
}

interface LiffContextType {
  user: AuthUser | null
  liffProfile: LiffUser | null
  isLoading: boolean
  isAuthenticated: boolean
  sessionToken: string | null
  isDevMode: boolean
  canSendMessages: boolean // 是否可以發送訊息到當前聊天室
  login: () => void
  logout: () => void
  refreshSession: () => Promise<void>
  updatePreferences: (preferences: UserPreferences) => void // 更新用戶偏好設定
}

const LiffContext = createContext<LiffContextType | undefined>(undefined)

const SESSION_TOKEN_KEY = "wander_wallet_session"
const DEV_SESSION_KEY = "wander_wallet_dev_session"

// 開發模式的模擬用戶
const DEV_USER: AuthUser = {
  id: "00000000-0000-0000-0000-000000000001",
  lineUserId: "U1234567890dev",
  name: "開發測試用戶",
  image: null,
  preferences: DEFAULT_PREFERENCES,
}

const DEV_LIFF_PROFILE: LiffUser = {
  lineUserId: "U1234567890dev",
  displayName: "開發測試用戶",
  pictureUrl: undefined,
  statusMessage: undefined,
}

export function LiffProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [liffProfile, setLiffProfile] = useState<LiffUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [canSendMessages, setCanSendMessages] = useState(false)

  const authenticateWithBackend = useCallback(async (accessToken: string) => {
    try {
      const response = await fetch("/api/auth/liff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessToken }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Backend authentication failed:", response.status, errorData)
        return null
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Failed to authenticate with backend:", error)
      return null
    }
  }, [])

  const refreshSession = useCallback(async () => {
    if (DEV_MODE) return

    const accessToken = getAccessToken()
    if (!accessToken) return

    const authData = await authenticateWithBackend(accessToken)
    if (authData) {
      setUser(authData.user)
      setSessionToken(authData.sessionToken)
      localStorage.setItem(SESSION_TOKEN_KEY, authData.sessionToken)
    }
  }, [authenticateWithBackend])

  useEffect(() => {
    async function initialize() {
      debugLog("[LIFF] Starting initialization...")

      // 開發模式：使用模擬數據
      if (DEV_MODE) {
        debugLog("[LIFF] DEV_MODE enabled, using mock data")
        // 檢查是否有已保存的開發 session
        const savedDevSession = localStorage.getItem(DEV_SESSION_KEY)
        if (savedDevSession) {
          debugLog("[LIFF] Found saved dev session, restoring user")
          setUser(DEV_USER)
          setLiffProfile(DEV_LIFF_PROFILE)
          setSessionToken("dev-session-token")
        }

        setIsLoading(false)
        return
      }

      // 判斷是否為公開路由
      const currentPath = window.location.pathname
      const urlParams = new URLSearchParams(window.location.search)
      const liffState = urlParams.get("liff.state")
      const hasOAuthCallback = urlParams.has("code") // OAuth callback 帶有 code 參數

      const isPublicRoute = PUBLIC_ROUTES.includes(currentPath) ||
        PUBLIC_PREFIXES.some(prefix => currentPath.startsWith(prefix))

      try {
        // 總是初始化 LIFF（登入按鈕需要）
        await initLiff()
        debugLog("[LIFF] SDK initialized successfully")

        // 檢查 sendMessages API 是否可用
        const sendMessagesAvailable = isSendMessagesAvailable()
        setCanSendMessages(sendMessagesAvailable)

        debugLog(`[LIFF] isLoggedIn: ${isLoggedIn()}, liffState: ${liffState}, hasOAuthCallback: ${hasOAuthCallback}, isPublicRoute: ${isPublicRoute}`)

        if (isLoggedIn()) {
          // 取得 LINE 用戶資料
          const profile = await getProfile()
          setLiffProfile(profile)
          debugLog(`[LIFF] Got profile: ${profile?.displayName}`)

          // 取得 access token 並向後端驗證
          const accessToken = getAccessToken()
          debugLog(`[LIFF] Access token exists: ${!!accessToken}`)

          if (accessToken) {
            const authData = await authenticateWithBackend(accessToken)
            debugLog(`[LIFF] Backend auth result: ${!!authData}`)

            if (authData) {
              setUser(authData.user)
              setSessionToken(authData.sessionToken)
              localStorage.setItem(SESSION_TOKEN_KEY, authData.sessionToken)
              debugLog(`[LIFF] User set: ${authData.user?.name || authData.user?.id}`)

              // 如果有 liff.state，跳轉到該路徑（處理深層連結）
              if (liffState && liffState !== currentPath) {
                debugLog(`[LIFF] Redirecting to liff.state: ${liffState}`)
                window.location.href = liffState
                return
              }
            }
          }
        } else if (!isPublicRoute) {
          // 非公開路由且未登入：觸發登入，帶入當前 URL 作為 redirectUri
          debugLog("[LIFF] Not logged in, triggering login with redirectUri")
          liffLogin(window.location.href)
        } else {
          // 公開路由且未登入：不強制登入，允許瀏覽
          debugLog("[LIFF] Public route, not logged in - allowing anonymous access")
        }
      } catch (error) {
        debugLog(`[LIFF] Initialization error: ${error}`, "error")
      } finally {
        debugLog("[LIFF] Initialization complete")
        setIsLoading(false)
      }
    }

    initialize()
  }, [authenticateWithBackend])

  const login = useCallback(() => {
    if (DEV_MODE) {
      // 開發模式：直接設置模擬用戶
      setUser(DEV_USER)
      setLiffProfile(DEV_LIFF_PROFILE)
      setSessionToken("dev-session-token")
      localStorage.setItem(DEV_SESSION_KEY, "true")
      return
    }
    debugLog("[LIFF] Manual login triggered with redirectUri")
    liffLogin(window.location.href)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setLiffProfile(null)
    setSessionToken(null)
    localStorage.removeItem(SESSION_TOKEN_KEY)
    localStorage.removeItem(DEV_SESSION_KEY)
    if (!DEV_MODE) {
      liffLogout()
    }
  }, [])

  // 更新用戶偏好設定（本地狀態更新，API 呼叫由設定頁面負責）
  const updatePreferences = useCallback((preferences: UserPreferences) => {
    setUser((prev) => {
      if (!prev) return prev
      return { ...prev, preferences }
    })
  }, [])

  const value: LiffContextType = {
    user,
    liffProfile,
    isLoading,
    isAuthenticated: !!user,
    sessionToken,
    isDevMode: DEV_MODE,
    canSendMessages,
    login,
    logout,
    refreshSession,
    updatePreferences,
  }

  return <LiffContext.Provider value={value}>{children}</LiffContext.Provider>
}

export function useLiff() {
  const context = useContext(LiffContext)
  if (!context) {
    throw new Error("useLiff must be used within LiffProvider")
  }
  return context
}

/**
 * Custom hook for making authenticated API calls
 */
export function useAuthFetch() {
  const { sessionToken, refreshSession } = useLiff()

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers)
      if (sessionToken) {
        headers.set("Authorization", `Bearer ${sessionToken}`)
      }

      let response = await fetch(url, {
        ...options,
        headers,
      })

      // If unauthorized, try to refresh session and retry
      if (response.status === 401) {
        await refreshSession()
        const newToken = localStorage.getItem(SESSION_TOKEN_KEY)
        if (newToken) {
          headers.set("Authorization", `Bearer ${newToken}`)
          response = await fetch(url, {
            ...options,
            headers,
          })
        }
      }

      return response
    },
    [sessionToken, refreshSession]
  )

  return authFetch
}

