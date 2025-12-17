"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, ArrowRight } from "lucide-react"

function JoinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get("code") || ""
  const [shareCode, setShareCode] = useState(codeFromUrl.toUpperCase())
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(!!codeFromUrl)
  const [error, setError] = useState<string | null>(null)
  const authFetch = useAuthFetch()

  // 如果 URL 有 code，自動檢查並嘗試加入
  useEffect(() => {
    if (!codeFromUrl) return

    async function autoJoin() {
      try {
        const res = await authFetch("/api/projects/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shareCode: codeFromUrl.toUpperCase() }),
        })

        const data = await res.json()

        if (res.ok) {
          // 成功加入或已是成員，直接跳轉
          router.replace(`/projects/${data.id}`)
          return
        }

        // 其他錯誤，顯示表單讓用戶手動處理
        setError(data.error || "加入專案失敗")
      } catch (err) {
        console.error("自動加入錯誤:", err)
        setError("加入專案失敗，請稍後再試")
      } finally {
        setChecking(false)
      }
    }

    autoJoin()
  }, [codeFromUrl, authFetch, router])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!shareCode.trim()) {
      setError("請輸入分享碼")
      return
    }

    setLoading(true)

    try {
      const res = await authFetch("/api/projects/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shareCode: shareCode.trim().toUpperCase(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "加入專案失敗")
        setLoading(false)
        return
      }

      // 成功加入或已是成員，導航到專案
      router.push(`/projects/${data.id}`)
    } catch (error) {
      console.error("加入專案錯誤:", error)
      setError("加入專案失敗，請稍後再試")
      setLoading(false)
    }
  }

  // 正在自動檢查中，顯示 loading
  if (checking) {
    return (
      <AppLayout title="加入專案" showBack>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-3">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <p className="text-sm text-muted-foreground">正在加入專案...</p>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="加入專案" showBack>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              透過分享碼加入
            </CardTitle>
            <CardDescription>
              輸入專案的分享碼以加入該旅行專案
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="shareCode" className="text-sm font-medium">
                  分享碼
                </label>
                <Input
                  id="shareCode"
                  placeholder="例如：ABC123XYZ456"
                  value={shareCode}
                  onChange={(e) => {
                    setShareCode(e.target.value.toUpperCase())
                    setError(null)
                  }}
                  disabled={loading}
                  className="font-mono text-lg tracking-wider"
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading || !shareCode.trim()}>
                {loading ? "加入中..." : (
                  <>
                    加入專案
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

export default function JoinProjectPage() {
  return (
    <Suspense fallback={
      <AppLayout title="加入專案" showBack>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    }>
      <JoinForm />
    </Suspense>
  )
}

