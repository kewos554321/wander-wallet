"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Plus, Share2, Trash2, Edit, Folder } from "lucide-react"
import { parseAvatarString, getAvatarIcon, getAvatarColor } from "@/components/avatar-picker"
import { getProjectShareUrl } from "@/lib/utils"
import { parseCover, getPresetCover } from "@/lib/covers"

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

  async function handleDelete(projectId: string) {
    if (!confirm("確定要刪除這個專案嗎？此操作無法復原。")) {
      return
    }

    try {
      const res = await authFetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || "刪除專案失敗")
        return
      }

      // 重新獲取專案列表
      fetchProjects()
    } catch (error) {
      console.error("刪除專案錯誤:", error)
      alert("刪除專案失敗")
    }
  }

  async function handleShare(projectId: string, projectName: string) {
    const shareUrl = getProjectShareUrl(projectId)

    if (navigator.share) {
      try {
        await navigator.share({
          title: `加入「${projectName}」`,
          text: "點擊連結加入旅行專案",
          url: shareUrl,
        })
      } catch {
        // 用戶取消分享
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      alert("分享連結已複製")
    }
  }

  return (
    <AppLayout title="所有專案">
      <div className="space-y-6 pb-20">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">載入中...</div>
        ) : projects.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Folder className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">還沒有專案</h3>
              <p className="text-muted-foreground text-sm mb-6">建立一個專案或加入其他人的專案</p>
              <Link href="/projects/new">
                <Button size="lg" className="rounded-full px-6">
                  <Plus className="h-4 w-4 mr-2" />
                  建立專案
                </Button>
              </Link>
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
                    className={`relative shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden py-0 gap-0 ${coverData.type !== "none" ? "h-36 border-0" : "border border-slate-200"}`}
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

                        {/* 選項按鈕 */}
                        <div className="absolute top-2 right-2 z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleShare(project.id, project.name) }}>
                                <Share2 className="h-4 w-4 mr-2" />
                                分享專案
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/projects/${project.id}`) }}>
                                <Edit className="h-4 w-4 mr-2" />
                                查看詳情
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(project.id) }} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                刪除專案
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* 資訊區 - 底部 */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-bold text-lg leading-tight">{project.name}</h3>
                              {dateRange && (
                                <p className="text-xs text-white/70 mt-0.5">{dateRange}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold tabular-nums">${totalAmount.toLocaleString("zh-TW")}</p>
                              <p className="text-[11px] text-white/70">人均 ${Math.round(perPerson).toLocaleString("zh-TW")}</p>
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
                      /* 無封面：原始設計 */
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate">{project.name}</h3>
                            {dateRange && (
                              <span className="text-[11px] text-muted-foreground">{dateRange}</span>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 -mr-2 -mt-1">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleShare(project.id, project.name) }}>
                                <Share2 className="h-4 w-4 mr-2" />
                                分享專案
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/projects/${project.id}`) }}>
                                <Edit className="h-4 w-4 mr-2" />
                                查看詳情
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(project.id) }} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                刪除專案
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-xl font-bold tabular-nums tracking-tight">${totalAmount.toLocaleString("zh-TW")}</span>
                          <span className="text-xs text-muted-foreground">/ 人均 ${Math.round(perPerson).toLocaleString("zh-TW")}</span>
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
