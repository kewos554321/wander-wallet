"use client"

import { use, useEffect, useState } from "react"
import Image from "next/image"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ArrowRight, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, User, Receipt, Wallet, Users, Share2, Copy, Check } from "lucide-react"
import { parseAvatarString, getAvatarIcon, getAvatarColor } from "@/components/avatar-picker"

interface Balance {
  memberId: string
  displayName: string
  userImage: string | null
  balance: number
}

interface Settlement {
  from: {
    memberId: string
    displayName: string
    userImage: string | null
  }
  to: {
    memberId: string
    displayName: string
    userImage: string | null
  }
  amount: number
}

interface SettleData {
  balances: Balance[]
  settlements: Settlement[]
  summary: {
    totalExpenses: number
    totalAmount: number
    totalShared: number
    isBalanced: boolean
  }
}

export default function SettlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<SettleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const authFetch = useAuthFetch()

  useEffect(() => {
    fetchSettleData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchSettleData() {
    try {
      const res = await authFetch(`/api/projects/${id}/settle`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
      } else {
        const errData = await res.json()
        setError(errData.error || "獲取結算數據失敗")
      }
    } catch (err) {
      console.error("獲取結算數據錯誤:", err)
      setError("獲取結算數據失敗")
    } finally {
      setLoading(false)
    }
  }

  // 生成分享文字
  function generateShareText(): string {
    if (!data) return ""

    const { settlements, summary } = data
    const lines: string[] = []

    lines.push("💰 結算明細")
    lines.push(`總支出：$${summary.totalAmount.toLocaleString("zh-TW")}`)
    lines.push("")

    if (settlements.length === 0) {
      lines.push("✅ 所有人都已結清！")
    } else {
      lines.push("📋 轉帳清單：")
      settlements.forEach((s, idx) => {
        lines.push(`${idx + 1}. ${s.from.displayName} ➡️ ${s.to.displayName}：$${s.amount.toLocaleString("zh-TW")}`)
      })
    }

    return lines.join("\n")
  }

  // 複製到剪貼簿
  async function handleCopy() {
    const text = generateShareText()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("複製失敗:", err)
    }
  }

  // 分享到 LINE
  function handleShareLINE() {
    const text = generateShareText()
    const encodedText = encodeURIComponent(text)
    // 使用 LINE URL scheme 分享文字
    window.open(`https://social-plugins.line.me/lineit/share?text=${encodedText}`, "_blank")
    setShareDialogOpen(false)
  }

  const backHref = `/projects/${id}`

  if (loading) {
    return (
      <AppLayout title="結算" showBack backHref={backHref}>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="結算" showBack backHref={backHref}>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
        </div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout title="結算" showBack backHref={backHref}>
        <div className="text-center py-8 text-muted-foreground">無結算數據</div>
      </AppLayout>
    )
  }

  const { balances, settlements, summary } = data

  // 分類餘額
  const creditors = balances.filter((b) => b.balance > 0.01).sort((a, b) => b.balance - a.balance)
  const debtors = balances.filter((b) => b.balance < -0.01).sort((a, b) => a.balance - b.balance)
  const settled = balances.filter((b) => Math.abs(b.balance) <= 0.01)

  return (
    <AppLayout title="結算" showBack backHref={backHref}>
      <div className="space-y-6 pb-20">
        {/* 分享按鈕 */}
        <div className="flex justify-end px-4">
          <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="h-4 w-4" />
                分享結算
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>分享結算結果</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {/* 預覽文字 */}
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-sm whitespace-pre-line max-h-48 overflow-y-auto">
                  {generateShareText()}
                </div>
                {/* 分享按鈕 */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        已複製
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        複製文字
                      </>
                    )}
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-[#06C755] hover:bg-[#05b34c] text-white"
                    onClick={handleShareLINE}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                    </svg>
                    LINE 分享
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 總覽 */}
        <Card>
          <CardHeader>
            <CardTitle>總覽</CardTitle>
            <CardDescription>專案支出統計</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {/* 總支出筆數 */}
              <div className="flex flex-col items-center p-4 rounded-xl bg-blue-50 dark:bg-blue-950/50">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-2">
                  <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {summary.totalExpenses}
                </span>
                <span className="text-xs text-muted-foreground mt-1">支出筆數</span>
              </div>

              {/* 總金額 */}
              <div className="flex flex-col items-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50">
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-2">
                  <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  ${summary.totalAmount >= 10000
                    ? (summary.totalAmount / 1000).toFixed(1) + 'k'
                    : summary.totalAmount.toLocaleString("zh-TW", { maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-muted-foreground mt-1">總金額</span>
              </div>

              {/* 人均支出 */}
              <div className="flex flex-col items-center p-4 rounded-xl bg-purple-50 dark:bg-purple-950/50">
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {balances.length > 0
                    ? `$${(summary.totalAmount / balances.length) >= 10000
                        ? ((summary.totalAmount / balances.length) / 1000).toFixed(1) + 'k'
                        : (summary.totalAmount / balances.length).toLocaleString("zh-TW", { maximumFractionDigits: 0 })}`
                    : '$0'}
                </span>
                <span className="text-xs text-muted-foreground mt-1">人均支出</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 結算建議 */}
        <Card>
          <CardHeader>
            <CardTitle>結算建議</CardTitle>
            <CardDescription>
              {settlements.length > 0
                ? `需要 ${settlements.length} 筆轉帳來完成結算`
                : "目前沒有需要結算的項目"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settlements.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {summary.totalExpenses === 0 ? "尚無支出記錄" : "所有人都已結清！"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {settlements.map((s, idx) => {
                  const fromAvatarData = parseAvatarString(s.from.userImage)
                  const toAvatarData = parseAvatarString(s.to.userImage)
                  const fromHasExternalImage = s.from.userImage && !s.from.userImage.startsWith("avatar:")
                  const toHasExternalImage = s.to.userImage && !s.to.userImage.startsWith("avatar:")
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex flex-col items-center gap-1">
                          {fromAvatarData ? (
                            <div
                              className="h-10 w-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: getAvatarColor(fromAvatarData.colorId) }}
                            >
                              {(() => { const Icon = getAvatarIcon(fromAvatarData.iconId); return <Icon className="h-5 w-5 text-white" /> })()}
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center overflow-hidden">
                              {fromHasExternalImage ? (
                                <Image
                                  src={s.from.userImage!}
                                  alt={s.from.displayName}
                                  width={40}
                                  height={40}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                          )}
                          <div className="font-medium text-sm">
                            {s.from.displayName}
                          </div>
                          <div className="text-xs text-muted-foreground">付款</div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex flex-col items-center gap-1">
                          {toAvatarData ? (
                            <div
                              className="h-10 w-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: getAvatarColor(toAvatarData.colorId) }}
                            >
                              {(() => { const Icon = getAvatarIcon(toAvatarData.iconId); return <Icon className="h-5 w-5 text-white" /> })()}
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden">
                              {toHasExternalImage ? (
                                <Image
                                  src={s.to.userImage!}
                                  alt={s.to.displayName}
                                  width={40}
                                  height={40}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-5 w-5 text-green-500" />
                              )}
                            </div>
                          )}
                          <div className="font-medium text-sm">
                            {s.to.displayName}
                          </div>
                          <div className="text-xs text-muted-foreground">收款</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">
                          ${s.amount.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 個人餘額明細 */}
        <Card>
          <CardHeader>
            <CardTitle>個人餘額</CardTitle>
            <CardDescription>每個人的收支狀況</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 應收款（付多了）*/}
            {creditors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">應收款（付多了）</span>
                </div>
                <div className="space-y-2">
                  {creditors.map((b) => {
                    const avatarData = parseAvatarString(b.userImage)
                    const hasExternalImage = b.userImage && !b.userImage.startsWith("avatar:")
                    return (
                      <div
                        key={b.memberId}
                        className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                      >
                        <div className="flex items-center gap-3">
                          {avatarData ? (
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: getAvatarColor(avatarData.colorId) }}
                            >
                              {(() => { const Icon = getAvatarIcon(avatarData.iconId); return <Icon className="h-4 w-4 text-white" /> })()}
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center overflow-hidden">
                              {hasExternalImage ? (
                                <Image
                                  src={b.userImage!}
                                  alt={b.displayName}
                                  width={32}
                                  height={32}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          )}
                          <span className="font-medium">{b.displayName}</span>
                        </div>
                        <span className="text-green-600 font-bold">
                          +${b.balance.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 應付款（付少了）*/}
            {debtors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600">應付款（欠款）</span>
                </div>
                <div className="space-y-2">
                  {debtors.map((b) => {
                    const avatarData = parseAvatarString(b.userImage)
                    const hasExternalImage = b.userImage && !b.userImage.startsWith("avatar:")
                    return (
                      <div
                        key={b.memberId}
                        className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
                      >
                        <div className="flex items-center gap-3">
                          {avatarData ? (
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: getAvatarColor(avatarData.colorId) }}
                            >
                              {(() => { const Icon = getAvatarIcon(avatarData.iconId); return <Icon className="h-4 w-4 text-white" /> })()}
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center overflow-hidden">
                              {hasExternalImage ? (
                                <Image
                                  src={b.userImage!}
                                  alt={b.displayName}
                                  width={32}
                                  height={32}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                          )}
                          <span className="font-medium">{b.displayName}</span>
                        </div>
                        <span className="text-red-600 font-bold">
                          ${b.balance.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 已結清 */}
            {settled.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">已結清</span>
                </div>
                <div className="space-y-2">
                  {settled.map((b) => {
                    const avatarData = parseAvatarString(b.userImage)
                    const hasExternalImage = b.userImage && !b.userImage.startsWith("avatar:")
                    return (
                      <div
                        key={b.memberId}
                        className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30"
                      >
                        <div className="flex items-center gap-3">
                          {avatarData ? (
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: getAvatarColor(avatarData.colorId) }}
                            >
                              {(() => { const Icon = getAvatarIcon(avatarData.iconId); return <Icon className="h-4 w-4 text-white" /> })()}
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                              {hasExternalImage ? (
                                <Image
                                  src={b.userImage!}
                                  alt={b.displayName}
                                  width={32}
                                  height={32}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                          )}
                          <span className="font-medium text-muted-foreground">{b.displayName}</span>
                        </div>
                        <span className="text-muted-foreground">$0.00</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {balances.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                尚無成員餘額數據
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}


