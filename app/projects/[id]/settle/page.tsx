"use client"

import { use, useEffect, useState } from "react"
import Image from "next/image"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowRight, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, User } from "lucide-react"
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

  useEffect(() => {
    fetchSettleData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchSettleData() {
    try {
      const res = await fetch(`/api/projects/${id}/settle`)
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

  if (loading) {
    return (
      <AppLayout title="結算" showBack>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="結算" showBack>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
        </div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout title="結算" showBack>
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
    <AppLayout title="結算" showBack>
      <div className="space-y-6 pb-20">
        {/* 總覽 */}
        <Card>
          <CardHeader>
            <CardTitle>總覽</CardTitle>
            <CardDescription>專案支出統計</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">總支出筆數</span>
              <span className="font-medium">{summary.totalExpenses} 筆</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">總金額</span>
              <span className="font-bold text-lg">
                ${summary.totalAmount.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {summary.totalExpenses > 0 && balances.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">人均支出</span>
                <span className="font-medium">
                  ${(summary.totalAmount / balances.length).toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
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


