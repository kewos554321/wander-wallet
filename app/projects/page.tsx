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
import { MoreVertical, Users, Plus, Share2, Trash2, Edit, ChevronRight, Folder } from "lucide-react"
import { parseAvatarString, getAvatarIcon, getAvatarColor } from "@/components/avatar-picker"

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

interface Expense {
  id: string
  amount: number
}

interface Project {
  id: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  shareCode: string
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    name: string | null
    email: string
  }
  members: ProjectMember[]
  expenses: Expense[]
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

  async function handleShare(shareCode: string) {
    const shareUrl = `${window.location.origin}/projects/join?code=${shareCode}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "加入我的旅行專案",
          text: "透過分享碼加入這個旅行專案",
          url: shareUrl,
        })
      } catch {
        // 用戶取消分享
      }
    } else {
      // 複製到剪貼板
      await navigator.clipboard.writeText(shareUrl)
      alert(`分享連結已複製：${shareCode}`)
    }
  }

  function calculateTotalAmount(expenses: Expense[]): number {
    return expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  }

  return (
    <AppLayout title="專案">
      <div className="space-y-6 pb-20">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">載入中...</div>
        ) : projects.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                <Folder className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="font-semibold text-lg mb-2">還沒有專案</h3>
              <p className="text-muted-foreground text-sm mb-6">建立一個專案來開始記錄旅行花費</p>
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
                const totalAmount = calculateTotalAmount(project.expenses)
                const memberCount = project._count.members || project.members.length
                const expenseCount = project._count.expenses || project.expenses.length
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

                return (
                  <Card
                    key={project.id}
                    className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    <CardContent className="p-4">
                      {/* 頂部：標題與選項 */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">{project.name}</h3>
                          {dateRange && (
                            <p className="text-xs text-muted-foreground mt-0.5">{dateRange}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 -mr-2 -mt-1">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleShare(project.shareCode)
                              }}
                            >
                              <Share2 className="h-4 w-4 mr-2" />
                              分享專案
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/projects/${project.id}`)
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              查看詳情
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(project.id)
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              刪除專案
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* 中間：金額資訊 */}
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-2xl font-semibold tabular-nums">
                          ${totalAmount.toLocaleString("zh-TW")}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          · 每人 ${Math.round(perPerson).toLocaleString("zh-TW")}
                        </span>
                      </div>

                      {/* 底部：成員與統計 */}
                      <div className="flex items-center justify-between">
                        {/* 成員頭像 */}
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {project.members.slice(0, 4).map((member) => {
                              const avatarData = parseAvatarString(member.user?.image)
                              const isCustomAvatar = avatarData !== null
                              const hasExternalImage = member.user?.image && !member.user.image.startsWith("avatar:")

                              if (isCustomAvatar) {
                                const Icon = getAvatarIcon(avatarData.iconId)
                                const color = getAvatarColor(avatarData.colorId)
                                return (
                                  <div
                                    key={member.id}
                                    className="h-7 w-7 rounded-full border-2 border-white flex items-center justify-center"
                                    style={{ backgroundColor: color }}
                                    title={member.displayName}
                                  >
                                    <Icon className="size-3.5 text-white" />
                                  </div>
                                )
                              }

                              return (
                                <div
                                  key={member.id}
                                  className="h-7 w-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center overflow-hidden"
                                  title={member.displayName}
                                >
                                  {hasExternalImage ? (
                                    <Image
                                      src={member.user!.image!}
                                      alt=""
                                      width={28}
                                      height={28}
                                      className="object-cover"
                                    />
                                  ) : (
                                    <span className="text-xs font-medium text-slate-500">
                                      {member.displayName.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                            {memberCount > 4 && (
                              <div className="h-7 w-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                                <span className="text-[10px] text-slate-500">+{memberCount - 4}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{memberCount} 人</span>
                        </div>

                        {/* 支出筆數 */}
                        <span className="text-xs text-muted-foreground">
                          {expenseCount} 筆支出
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* 新增專案按鈕 */}
            <Link href="/projects/new" className="block">
              <button className="w-full py-4 px-4 rounded-xl border border-dashed border-slate-200 text-sm text-muted-foreground hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
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
