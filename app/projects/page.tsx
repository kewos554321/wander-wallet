"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Wallet } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { parseAvatarString, getAvatarIcon, getAvatarColor } from "@/components/avatar-picker"
import { parseCover, getPresetCover } from "@/lib/covers"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"

interface ProjectMember {
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

interface Project {
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
  members: ProjectMember[]
  totalAmount: number
  _count: {
    expenses: number
    members: number
  }
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const authFetch = useAuthFetch()

  useEffect(() => {
    fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchProjects() {
    try {
      const res = await authFetch("/api/projects")
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error("獲取專案失敗:", res.status, errorData)
        return
      }
      const data = await res.json()
      setProjects(data)
    } catch (error) {
      console.error("獲取專案錯誤:", error)
    } finally {
      setLoading(false)
    }
  }


  return (
    <AppLayout title="所有專案">
      <div className="space-y-6 pb-20">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <Skeleton className="h-7 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      {[...Array(3)].map((_, j) => (
                        <Skeleton key={j} className="h-5 w-5 rounded-full" />
                      ))}
                    </div>
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="border border-border shadow-sm overflow-hidden">
            <CardContent className="py-16 text-center relative">
              {/* 背景裝飾 */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-transparent to-brand-100/50 dark:from-brand-100/20 dark:to-brand-200/20" />
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-200 dark:to-brand-300 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-brand-200/50 dark:shadow-brand-400/20">
                  <Wallet className="h-10 w-10 text-brand-600 dark:text-brand-400" />
                </div>
                <h3 className="font-bold text-xl mb-2 text-foreground">開始你的第一個專案</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                  建立專案來追蹤旅行或活動的共同開銷，輕鬆分帳
                </p>
                <Link href="/projects/new">
                  <Button size="lg" className="rounded-full px-8 shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30 transition-all">
                    <Plus className="h-4 w-4 mr-2" />
                    建立專案
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 專案列表 */}
            <div className="space-y-3">
              {projects.map((project) => {
                const totalAmount = project.totalAmount
                const memberCount = project._count.members || project.members.length
                const expenseCount = project._count.expenses
                const perPerson = memberCount > 0 ? totalAmount / memberCount : 0

                // 格式化日期
                const formatDateRange = () => {
                  if (!project.startDate && !project.endDate) return null
                  const start = project.startDate ? new Date(project.startDate).toLocaleDateString("zh-TW", { month: "short", day: "numeric" }) : ""
                  const end = project.endDate ? new Date(project.endDate).toLocaleDateString("zh-TW", { month: "short", day: "numeric" }) : ""
                  if (start && end) return `${start} - ${end}`
                  if (start) return `${start} 出發`
                  return null
                }
                const dateRange = formatDateRange()

                // 解析封面
                const coverData = parseCover(project.cover)
                const presetCover = coverData.type === "preset" ? getPresetCover(coverData.presetId!) : null

                return (
                  <Card
                    key={project.id}
                    className={`relative shadow-md hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer overflow-hidden py-0 gap-0 ${coverData.type !== "none" ? "h-36 border-0" : "border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"}`}
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    {/* 有封面：全景覆蓋設計 */}
                    {coverData.type !== "none" ? (
                      <>
                        {/* Cover 背景 */}
                        <div className="absolute inset-0">
                          {coverData.type === "preset" && presetCover ? (
                            <div
                              className="absolute inset-0"
                              style={{ background: presetCover.gradient }}
                            />
                          ) : coverData.type === "custom" && coverData.customUrl ? (
                            <Image
                              src={coverData.customUrl}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          ) : null}
                          {/* 漸層遮罩 */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        </div>

                        {/* 資訊區 - 底部 */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0 mr-3">
                              <h3 className="font-bold text-lg leading-tight">{project.name}</h3>
                              {project.description && (
                                <p className="text-xs text-white/80 mt-0.5 truncate">{project.description}</p>
                              )}
                              {dateRange && (
                                <p className="text-xs text-white/60 mt-0.5">{dateRange}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold tabular-nums">{formatCurrency(totalAmount, project.currency || DEFAULT_CURRENCY)}</p>
                              <p className="text-[11px] text-white/70">人均 {formatCurrency(Math.round(perPerson), project.currency || DEFAULT_CURRENCY)}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-white/80">
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-1.5">
                                {project.members.slice(0, 3).map((member) => {
                                  const avatarData = parseAvatarString(member.user?.image)
                                  const isCustomAvatar = avatarData !== null
                                  const hasExternalImage = member.user?.image && !member.user.image.startsWith("avatar:")
                                  if (isCustomAvatar) {
                                    const Icon = getAvatarIcon(avatarData.iconId)
                                    const color = getAvatarColor(avatarData.colorId)
                                    return (
                                      <div key={member.id} className="h-5 w-5 rounded-full border border-white/50 flex items-center justify-center" style={{ backgroundColor: color }}>
                                        <Icon className="size-2.5 text-white" />
                                      </div>
                                    )
                                  }
                                  return (
                                    <div key={member.id} className="h-5 w-5 rounded-full bg-white/30 border border-white/50 flex items-center justify-center overflow-hidden">
                                      {hasExternalImage ? (
                                        <Image src={member.user!.image!} alt="" width={20} height={20} className="object-cover" />
                                      ) : (
                                        <span className="text-[9px] font-medium">{member.displayName.charAt(0).toUpperCase()}</span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                              <span>{memberCount} 人</span>
                            </div>
                            <span>{expenseCount} 筆支出</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* 無封面：加入左側色條 */
                      <CardContent className="p-4 pl-5 relative overflow-hidden">
                        {/* 左側色條 */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-400 to-brand-600" />
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate">{project.name}</h3>
                            {project.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
                            )}
                            {dateRange && (
                              <span className="text-[11px] text-muted-foreground">{dateRange}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-xl font-bold tabular-nums tracking-tight">{formatCurrency(totalAmount, project.currency || DEFAULT_CURRENCY)}</span>
                          <span className="text-xs text-muted-foreground">/ 人均 {formatCurrency(Math.round(perPerson), project.currency || DEFAULT_CURRENCY)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-1.5">
                              {project.members.slice(0, 3).map((member) => {
                                const avatarData = parseAvatarString(member.user?.image)
                                const isCustomAvatar = avatarData !== null
                                const hasExternalImage = member.user?.image && !member.user.image.startsWith("avatar:")
                                if (isCustomAvatar) {
                                  const Icon = getAvatarIcon(avatarData.iconId)
                                  const color = getAvatarColor(avatarData.colorId)
                                  return (
                                    <div key={member.id} className="h-5 w-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm" style={{ backgroundColor: color }}>
                                      <Icon className="size-2.5 text-white" />
                                    </div>
                                  )
                                }
                                return (
                                  <div key={member.id} className="h-5 w-5 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center overflow-hidden shadow-sm">
                                    {hasExternalImage ? (
                                      <Image src={member.user!.image!} alt="" width={20} height={20} className="object-cover" />
                                    ) : (
                                      <span className="text-[9px] font-medium text-slate-500">{member.displayName.charAt(0).toUpperCase()}</span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                            <span className="text-xs text-muted-foreground">{memberCount} 人</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{expenseCount} 筆支出</span>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>

            {/* 新增專案按鈕 */}
            <Link href="/projects/new" className="block">
              <button className="w-full py-4 px-4 rounded-xl border border-dashed border-slate-200 text-sm text-muted-foreground hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                新增專案
              </button>
            </Link>
          </>
        )}
      </div>
    </AppLayout>
  )
}
