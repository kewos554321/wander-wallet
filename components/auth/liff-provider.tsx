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
  LiffUser,
} from "@/lib/liff"

// 開發模式：當 LIFF_ID 未設定時，使用模擬數據
const DEV_MODE = !process.env.NEXT_PUBLIC_LIFF_ID

interface AuthUser {
  id: string
  lineUserId: string
  name: string | null
  image: string | null
}

interface LiffContextType {
  user: AuthUser | null
  liffProfile: LiffUser | null
  isLoading: boolean
  isAuthenticated: boolean
  sessionToken: string | null
  isDevMode: boolean
  login: () => void
  logout: () => void
  refreshSession: () => Promise<void>
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
        console.error("Backend authentication failed")
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
      // 開發模式：使用模擬數據
      if (DEV_MODE) {
        console.warn("LIFF DEV MODE: Using mock data. Set NEXT_PUBLIC_LIFF_ID for production.")

        // 檢查是否有已保存的開發 session
        const savedDevSession = localStorage.getItem(DEV_SESSION_KEY)
        if (savedDevSession) {
          setUser(DEV_USER)
          setLiffProfile(DEV_LIFF_PROFILE)
          setSessionToken("dev-session-token")
        }

        setIsLoading(false)
        return
      }

      try {
        await initLiff()

        if (isLoggedIn()) {
          // 取得 LINE 用戶資料
          const profile = await getProfile()
          setLiffProfile(profile)

          // 取得 access token 並向後端驗證
          const accessToken = getAccessToken()
          if (accessToken) {
            const authData = await authenticateWithBackend(accessToken)
            if (authData) {
              setUser(authData.user)
              setSessionToken(authData.sessionToken)
              localStorage.setItem(SESSION_TOKEN_KEY, authData.sessionToken)
            }
          }
        } else {
          // 自動登入（在 LINE App 內或外部瀏覽器都會跳轉到 LINE Login）
          liffLogin()
        }
      } catch (error) {
        console.error("LIFF initialization error:", error)
      } finally {
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
    liffLogin()
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

  const value: LiffContextType = {
    user,
    liffProfile,
    isLoading,
    isAuthenticated: !!user,
    sessionToken,
    isDevMode: DEV_MODE,
    login,
    logout,
    refreshSession,
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
