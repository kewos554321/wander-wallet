"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, DollarSign, Plus, Share2, ArrowRight, User, Calendar } from "lucide-react"

interface ProjectMember {
  id: string
  role: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface Expense {
  id: string
  amount: number
  description: string | null
}

interface Project {
  id: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  shareCode: string
  creator: {
    id: string
    name: string | null
    email: string
  }
  members: ProjectMember[]
  expenses: Expense[]
}

export default function ProjectOverview({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProject()
  }, [id])

  async function fetchProject() {
    try {
      const res = await fetch(`/api/projects/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          router.push("/projects")
          return
        }
        console.error("獲取專案失敗")
        return
      }
      const data = await res.json()
      setProject(data)
    } catch (error) {
      console.error("獲取專案錯誤:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleShare() {
    if (!project) return

    const shareUrl = `${window.location.origin}/projects/join?code=${project.shareCode}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `加入 ${project.name}`,
          text: "透過分享碼加入這個旅行專案",
          url: shareUrl,
        })
      } catch (error) {
        // 用戶取消分享
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      alert(`分享連結已複製：${project.shareCode}`)
    }
  }

  function calculateTotalAmount(expenses: Expense[]): number {
    return expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  }

  if (loading) {
    return (
      <AppLayout title="載入中..." showBack>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  if (!project) {
    return (
      <AppLayout title="專案不存在" showBack>
        <div className="text-center py-8 text-muted-foreground">專案不存在或無權限訪問</div>
      </AppLayout>
    )
  }

  const totalAmount = calculateTotalAmount(project.expenses)

  return (
    <AppLayout title={project.name} showBack>
      <div className="space-y-4 pb-20">
        {/* 專案資訊 */}
        {(project.description || project.startDate || project.endDate) && (
          <Card>
            <CardContent className="pt-6 space-y-2">
              {project.description && (
                <p className="text-sm text-muted-foreground">{project.description}</p>
              )}
              {(project.startDate || project.endDate) && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {project.startDate && project.endDate
                      ? `${project.startDate} 至 ${project.endDate}`
                      : project.startDate
                      ? `出發：${project.startDate}`
                      : project.endDate
                      ? `結束：${project.endDate}`
                      : ""}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 統計資訊 */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">成員</div>
                  <div className="text-xl font-bold">{project.members.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">總支出</div>
                  <div className="text-xl font-bold">
                    ${totalAmount.toLocaleString("zh-TW", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 成員列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>成員</CardTitle>
                <CardDescription>專案參與者列表</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-1" />
                分享
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {project.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {member.user.image ? (
                        <img
                          src={member.user.image}
                          alt={member.user.name || member.user.email}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {member.user.name || member.user.email?.split("@")[0] || "未知用戶"}
                        {member.role === "owner" && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            建立者
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{member.user.email}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="text-xs text-muted-foreground">
                分享碼：<span className="font-mono font-semibold">{project.shareCode}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 快速操作 */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/projects/${id}/expenses/new`}>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              新增支出
            </Button>
          </Link>
          <Link href={`/projects/${id}/expenses`}>
            <Button variant="outline" className="w-full">
              支出列表
            </Button>
          </Link>
          <Link href={`/projects/${id}/settle`} className="col-span-2">
            <Button variant="secondary" className="w-full">
              查看結算
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
