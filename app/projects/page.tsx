"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Users, DollarSign, Plus, Share2, Trash2, Edit } from "lucide-react"

interface ProjectMember {
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
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

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects")
      if (!res.ok) {
        // 檢查是否需要登出
        if (res.status === 401) {
          try {
            const error = await res.json()
            if (error.requiresLogout) {
              await signOut({ 
                redirect: true, 
                callbackUrl: "/login?error=session_invalid" 
              })
              return
            }
          } catch {
            // 如果解析錯誤失敗，仍然嘗試登出
            await signOut({ 
              redirect: true, 
              callbackUrl: "/login?error=session_invalid" 
            })
            return
          }
        }
        console.error("獲取專案失敗")
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
      const res = await fetch(`/api/projects/${projectId}`, {
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
      } catch (error) {
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
      <div className="space-y-4 pb-20">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">旅行專案</h2>
          <Link href="/projects/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              新增專案
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">載入中...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">目前還沒有專案</p>
            <Link href="/projects/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                建立第一個專案
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => {
              const totalAmount = calculateTotalAmount(project.expenses)
              const memberCount = project._count.members || project.members.length
              const expenseCount = project._count.expenses || project.expenses.length

              return (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="truncate">
                          {project.name}
                        </CardTitle>
                        {project.description && (
                          <CardDescription className="mt-1 line-clamp-2">
                            {project.description}
                          </CardDescription>
                        )}
                      </div>
                      <CardAction>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">更多選項</span>
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
                              編輯專案
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
                      </CardAction>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground">成員</div>
                          <div className="font-semibold">{memberCount}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground">費用</div>
                          <div className="font-semibold">{expenseCount} 筆</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground">總額</div>
                          <div className="font-semibold">
                            ${totalAmount.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-xs text-muted-foreground">
                        分享碼：<span className="font-mono font-semibold">{project.shareCode}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
