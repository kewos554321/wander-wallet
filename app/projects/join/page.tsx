"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, ArrowRight } from "lucide-react"

export default function JoinProjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [shareCode, setShareCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 從URL參數中獲取分享碼
    const code = searchParams.get("code")
    if (code) {
      setShareCode(code.toUpperCase())
    }
  }, [searchParams])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!shareCode.trim()) {
      setError("請輸入分享碼")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/projects/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shareCode: shareCode.trim().toUpperCase(),
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        setError(errorData.error || "加入專案失敗")
        setLoading(false)
        return
      }

      const project = await res.json()
      // 導航到加入的專案
      router.push(`/projects/${project.id}`)
    } catch (error) {
      console.error("加入專案錯誤:", error)
      setError("加入專案失敗，請稍後再試")
      setLoading(false)
    }
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

